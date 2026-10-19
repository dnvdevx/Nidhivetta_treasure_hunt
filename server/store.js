// Shared game-state storage.
//
// Production (Vercel) MUST use Upstash Redis: serverless instances do not share a filesystem,
// so a JSON file in /tmp gives every instance its own private copy of the game. That was the
// cause of teams randomly "going back" to earlier stages.
//
// Local development falls back to server/data/store.json.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const isRedisConfigured = Boolean(REDIS_URL && REDIS_TOKEN);
export const IS_VERCEL = Boolean(process.env.VERCEL || process.env.NOW_REGION);

const STORE_KEY = 'thanima:store';
const LOCK_KEY = 'thanima:lock';
const PHOTO_KEY_PREFIX = 'thanima:photo:';
const LOCK_TTL_MS = 10000;
const LOCK_WAIT_MS = 9000;
// Short per-instance read cache to keep Redis command usage low while 40+ phones poll.
// Writes always read fresh inside the lock, so this can only delay a read by up to this long.
const READ_CACHE_MS = 1000;

const LOCAL_DIR = IS_VERCEL ? '/tmp/thanima' : path.join(__dirname, 'data');
const LOCAL_STORE_FILE = path.join(LOCAL_DIR, 'store.json');
const LOCAL_PHOTO_DIR = path.join(LOCAL_DIR, 'photos');

if (isRedisConfigured) {
  console.log('Game state storage: Upstash Redis (shared across all serverless instances).');
} else if (IS_VERCEL) {
  console.error(
    '⚠️ Game state storage: NO REDIS CONFIGURED ON VERCEL. Each serverless instance keeps its own copy, ' +
      'so team progress WILL appear to revert. Connect Upstash Redis to this Vercel project.'
  );
} else {
  console.log('Game state storage: local JSON file (development only).');
}

export const storageBackend = isRedisConfigured
  ? 'Upstash Redis (shared)'
  : IS_VERCEL
  ? 'Local /tmp JSON (NOT SHARED - progress will revert!)'
  : 'Local JSON file (development)';

async function redis(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    throw new Error(`Database error: ${body.error || res.status}`);
  }
  return body.result;
}

let seedFactory = () => ({});
let normalizer = (store) => store;

// db.js registers how to build a fresh store and how to migrate an existing one.
export function configureStore({ createInitialStore, normalizeStore }) {
  seedFactory = createInitialStore;
  normalizer = normalizeStore;
}

async function loadRaw() {
  if (isRedisConfigured) {
    let raw = await redis(['GET', STORE_KEY]);
    if (raw == null) {
      // NX: if two instances seed at once, only the first write wins.
      await redis(['SET', STORE_KEY, JSON.stringify(seedFactory()), 'NX']);
      raw = await redis(['GET', STORE_KEY]);
    }
    return JSON.parse(raw);
  }
  try {
    return JSON.parse(fs.readFileSync(LOCAL_STORE_FILE, 'utf-8'));
  } catch (_) {
    return seedFactory();
  }
}

async function saveRaw(store) {
  if (isRedisConfigured) {
    await redis(['SET', STORE_KEY, JSON.stringify(store)]);
    return;
  }
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  const tmp = `${LOCAL_STORE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, LOCAL_STORE_FILE);
}

let cached = null;
let cachedAt = 0;

// Read-only snapshot of the store. Never mutate and save it; use updateStore instead.
export async function readStore() {
  if (cached && Date.now() - cachedAt < READ_CACHE_MS) {
    return structuredClone(cached);
  }
  const { store } = normalizer(await loadRaw());
  cached = store;
  cachedAt = Date.now();
  return structuredClone(store);
}

// --- Locking: every mutation is a serialized read-modify-write ---

let localChain = Promise.resolve();

async function acquireRedisLock() {
  const token = crypto.randomUUID();
  const deadline = Date.now() + LOCK_WAIT_MS;
  while (Date.now() < deadline) {
    const ok = await redis(['SET', LOCK_KEY, token, 'NX', 'PX', String(LOCK_TTL_MS)]);
    if (ok === 'OK') return token;
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 60));
  }
  throw new Error('Server is busy, please try again in a moment.');
}

async function releaseRedisLock(token) {
  const script =
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
  try {
    await redis(['EVAL', script, '1', LOCK_KEY, token]);
  } catch (err) {
    console.error('Failed to release store lock:', err);
  }
}

// Run fn(store) with exclusive access, then persist the store. If fn throws, nothing is saved.
export async function updateStore(fn) {
  const run = async () => {
    const { store } = normalizer(await loadRaw());
    const result = await fn(store);
    await saveRaw(store);
    cached = store;
    cachedAt = Date.now();
    return result;
  };

  if (isRedisConfigured) {
    const token = await acquireRedisLock();
    try {
      return await run();
    } finally {
      await releaseRedisLock(token);
    }
  }

  const next = localChain.then(run, run);
  localChain = next.catch(() => {});
  return next;
}

// --- Photo images are stored outside the main document to keep it small ---

export async function savePhoto(id, dataUrl) {
  if (isRedisConfigured) {
    await redis(['SET', PHOTO_KEY_PREFIX + id, dataUrl]);
    return;
  }
  fs.mkdirSync(LOCAL_PHOTO_DIR, { recursive: true });
  fs.writeFileSync(path.join(LOCAL_PHOTO_DIR, `${id}.txt`), dataUrl);
}

export async function loadPhoto(id) {
  if (isRedisConfigured) {
    return redis(['GET', PHOTO_KEY_PREFIX + id]);
  }
  try {
    return fs.readFileSync(path.join(LOCAL_PHOTO_DIR, `${id}.txt`), 'utf-8');
  } catch (_) {
    return null;
  }
}

export async function deletePhotos(ids) {
  const list = (ids || []).filter(Boolean);
  if (list.length === 0) return;
  if (isRedisConfigured) {
    try {
      await redis(['DEL', ...list.map((id) => PHOTO_KEY_PREFIX + id)]);
    } catch (err) {
      console.error('Failed to delete photos:', err);
    }
    return;
  }
  for (const id of list) {
    try {
      fs.unlinkSync(path.join(LOCAL_PHOTO_DIR, `${id}.txt`));
    } catch (_) {}
  }
}
