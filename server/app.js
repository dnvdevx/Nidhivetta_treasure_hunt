import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  JWT_SECRET,
  HttpError,
  storageBackend,
  loadPhoto,
  verifyPhotoSig,
  getTeamState,
  getAllTeams,
  verifyEntryScan,
  advanceTeamTaskByQR,
  completeTeamTask,
  submitPhotoTarget,
  skipPhotoTarget,
  reviewPhotoSubmission,
  getAllPhotoSubmissions,
  verifyBoatCode,
  unlockBoatQuestion,
  getBoatQuestions,
  getBoatLocations,
  updateBoatQuestion,
  clearBoatClaim,
  getLeaderboard,
  updateTeamRoster,
  resetTeam,
  resetAllTeams,
  getStartingStations,
  updateStartingStation,
  denyTeamTask
} from './db.js';
import {
  STARTING_STATIONS,
  GAME_DETAILS,
  TEAM_GAME_SCHEDULE,
  verifyAdminOrStationPasscode
} from './scheduleData.js';
import { generateQrWithLogo } from './qrHelper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Authenticate Master Organizers or Game Station Volunteers.
// The passcode comes from the JSON body or the x-admin-key header (never the URL, which gets logged).
// `games`: schedule game names a station volunteer may act on; masters are always allowed.
export function checkAdminAuth(req, { masterOnly = false, games = null } = {}) {
  const key =
    req.body?.adminKey ||
    req.body?.passcode ||
    req.body?.masterPassword ||
    req.body?.resetPasscode ||
    req.headers['x-admin-key'];
  const result = verifyAdminOrStationPasscode(key);
  if (!result.valid) {
    return { ok: false, status: 403, error: 'Unauthorized. Invalid Organizer or Station Passcode.' };
  }
  if (masterOnly && !result.isMaster) {
    return { ok: false, status: 403, error: 'Master Organizer privileges required for this action.' };
  }
  if (games && !result.isMaster && !games.some((g) => result.aliases.includes(g))) {
    return { ok: false, status: 403, error: 'Your station passcode does not have access to this game.' };
  }
  return { ok: true, auth: result };
}

// Wrap an async route: auth check (optional) + uniform error responses.
function route(handler, authOptions = null) {
  return async (req, res) => {
    let auth = null;
    if (authOptions) {
      const check = checkAdminAuth(req, authOptions);
      if (!check.ok) return res.status(check.status).json({ error: check.error });
      auth = check.auth;
    }
    try {
      await handler(req, res, auth);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status >= 500) console.error(`Error in ${req.method} ${req.path}:`, err);
      res.status(status).json({ error: err.message || 'Something went wrong.' });
    }
  };
}

const ANY_ADMIN = {};
const MASTER_ONLY = { masterOnly: true };
const PHOTO_STAFF = { games: ['Photo Game'] };
const BOAT_STAFF = { games: ['Boat Game'] };

// Station volunteers may only approve/deny teams currently at their own game.
const allowedGamesFor = (auth) => (auth.isMaster ? null : auth.aliases);

const app = express();

app.use(cors());
// Support base64 image uploads for Photo Game
app.use(express.json({ limit: '6mb' }));

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please enter via your starting station.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired. Please scan your starting station QR again.' });
    }
    req.user = user;
    next();
  });
}

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Thanima Nidhiveta (KERALAM) API',
    database: storageBackend,
    totalTeams: 10,
    timestamp: new Date().toISOString()
  });
});

// 2. Starting stations list
app.get('/api/starting-stations', (req, res) => {
  res.json(STARTING_STATIONS.map((s) => ({
    stationId: s.stationId,
    locationHint: s.locationHint
  })));
});

// 3. Entry Scan (Game 1 / Starting Station)
app.post('/api/entry/scan', route(async (req, res) => {
  const { stationQr, passcode, regNo, memberId } = req.body;
  if (!stationQr || !passcode) {
    throw new HttpError(400, 'Station QR code and Team Passcode are required.');
  }

  const { team, member, currentTask } = await verifyEntryScan({ stationQr, passcode, regNo, memberId });

  const token = jwt.sign(
    {
      teamId: team.id,
      teamNumber: team.team_number,
      teamName: team.name,
      memberId: member?.id,
      memberName: member?.name,
      regNo: member?.reg_no
    },
    JWT_SECRET,
    { expiresIn: '3d' }
  );

  res.json({
    message: `🎉 Welcome ${team.name}! Starting station verified. Letter "K" unlocked!`,
    token,
    team,
    member,
    currentTask
  });
}));

// 4. Get Current Team state & dynamically resolved task clue
app.get('/api/teams/me', authenticateToken, route(async (req, res) => {
  const state = await getTeamState(req.user.teamId);
  if (!state) throw new HttpError(404, 'Team not found.');

  const { team, currentTask } = state;
  const member = (team.members || []).find((m) => m.id === req.user.memberId) || {
    id: req.user.memberId,
    name: req.user.memberName,
    reg_no: req.user.regNo
  };

  res.json({
    team,
    member,
    currentTask,
    revealedM: (team.current_step || 0) >= 6
  });
}));

// 4b. Legacy endpoint kept for browsers still running the old app bundle.
// Progress can no longer be pushed from the client: the shared database is the single source of truth.
app.post('/api/teams/sync-progress', authenticateToken, route(async (req, res) => {
  const state = await getTeamState(req.user.teamId);
  if (!state) throw new HttpError(404, 'Team not found');
  res.json({ success: true, ...state });
}));

// 5. Scan Station QR Code for in-game challenge
app.post('/api/tasks/scan', authenticateToken, route(async (req, res) => {
  const { qrCode } = req.body;
  if (!qrCode || typeof qrCode !== 'string') {
    throw new HttpError(400, 'QR Code value is required.');
  }

  const result = await advanceTeamTaskByQR({
    teamId: req.user.teamId,
    participantId: req.user.memberId,
    participantName: req.user.memberName,
    scannedCode: qrCode
  });
  res.json(result);
}));

// 6. PHOTO GAME: Submit photo
app.post('/api/photo-game/submit', authenticateToken, route(async (req, res) => {
  const { targetIndex, imageUrl } = req.body;
  const targetIdx = Number(targetIndex);
  if (isNaN(targetIdx) || !imageUrl) {
    throw new HttpError(400, 'Target index and photo image are required.');
  }

  const { submission, photoGameState } = await submitPhotoTarget({
    teamId: req.user.teamId,
    targetIndex: targetIdx,
    imageUrl,
    participantName: req.user.memberName
  });

  res.json({
    message: 'Photo submitted to the Station Marshal for review!',
    submission,
    photoGameState
  });
}));

// 7. PHOTO GAME: Skip photo target to reveal next target (max 2 skips)
app.post('/api/photo-game/skip', authenticateToken, route(async (req, res) => {
  res.json(await skipPhotoTarget({ teamId: req.user.teamId }));
}));

// 7b. Serve an uploaded photo. URLs are HMAC-signed per photo, so only the team and staff
// who were handed the URL can open it.
app.get('/api/photos/:id', route(async (req, res) => {
  const { id } = req.params;
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(id) || !verifyPhotoSig(id, req.query.sig)) {
    throw new HttpError(403, 'Invalid photo link.');
  }
  const dataUrl = await loadPhoto(id);
  const match = typeof dataUrl === 'string' && dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s);
  if (!match) throw new HttpError(404, 'Photo not found.');

  res.set('Content-Type', match[1]);
  // Photo ids are never reused, so the image behind a URL never changes.
  res.set('Cache-Control', 'private, max-age=86400, immutable');
  res.send(Buffer.from(match[2], 'base64'));
}));

// 8a. BOAT GAME: Step 1 - Unlock question using Question Boat Code
app.post('/api/boat-game/unlock-question', authenticateToken, route(async (req, res) => {
  const { questionCode } = req.body;
  if (!questionCode) throw new HttpError(400, 'Question boat code is required.');
  res.json(await unlockBoatQuestion({ teamId: req.user.teamId, questionCode }));
}));

// 8b. BOAT GAME: Step 2 - Verify 6-character alphanumeric answer boat code
app.post('/api/boat-game/verify', authenticateToken, route(async (req, res) => {
  const { code } = req.body;
  if (!code) throw new HttpError(400, 'Boat answer code is required.');
  res.json(await verifyBoatCode({
    teamId: req.user.teamId,
    code,
    participantName: req.user.memberName,
    participantId: req.user.memberId
  }));
}));

// 8c. BOAT GAME: Get the 5 Campus Locations & Riddles
app.get('/api/boat-game/locations', route(async (req, res) => {
  res.json(await getBoatLocations());
}));

// Admin & Station Volunteer Login / Verification
app.post('/api/admin/login', (req, res) => {
  const { passcode } = req.body;
  const result = verifyAdminOrStationPasscode(passcode);
  if (!result.valid) {
    return res.status(401).json({ error: result.error || 'Invalid passcode.' });
  }

  res.json({
    success: true,
    role: result.role,
    isMaster: result.isMaster,
    displayName: result.displayName,
    gameName: result.gameName,
    icon: result.icon
  });
});

// 9. Admin: Get 10 Boat Game Questions & Codes (20 Boats: 10 Question Boats + 10 Answer Boats)
app.get('/api/admin/boat-questions', route(async (req, res) => {
  res.json(await getBoatQuestions());
}, BOAT_STAFF));

// 10. Admin: Update a Boat Game Question/Answer/Codes (Master Only)
app.post('/api/admin/boat-questions/update', route(async (req, res) => {
  const { teamNumber, question, answer, questionCode, answerCode, code } = req.body;
  const updated = await updateBoatQuestion(teamNumber, { question, answer, questionCode, answerCode, code });
  res.json({ message: 'Boat challenge updated', question: updated });
}, MASTER_ONLY));

// 10b. Admin: Release/clear a team's Question Boat claim
app.post('/api/admin/boat-questions/clear-claim', route(async (req, res) => {
  const { teamId, questionBoatNumber } = req.body;
  const cleared = await clearBoatClaim(questionBoatNumber || teamId);
  res.json({ message: 'Boat claim released successfully', team: cleared });
}, BOAT_STAFF));

// 10c. Admin: Printable boat tag sheet (contains every boat code, so it is not a public file)
app.get('/api/admin/print/boat-tags', route(async (req, res) => {
  const file = path.join(__dirname, '..', 'qrs', 'print-boat-tags.html');
  if (!fs.existsSync(file)) {
    throw new HttpError(404, 'Boat tag sheet not generated. Run: node scripts/generate-boat-tags.js');
  }
  res.set('Cache-Control', 'no-store');
  res.type('html').send(fs.readFileSync(file, 'utf-8'));
}, BOAT_STAFF));

// 8. Live Leaderboard
app.get('/api/leaderboard', route(async (req, res) => {
  res.json(await getLeaderboard());
}));

// 9. Admin: Get all 10 teams and rosters (team passcodes only for master organizers)
app.get('/api/admin/teams', route(async (req, res, auth) => {
  const teams = await getAllTeams({ includePasscodes: auth.isMaster });
  res.json({ teams, schedules: TEAM_GAME_SCHEDULE });
}, ANY_ADMIN));

// 10. Admin: Update team roster / passcode (Master Only)
app.post('/api/admin/teams/update', route(async (req, res) => {
  const { teamId, name, passcode, members } = req.body;
  const updated = await updateTeamRoster(teamId, { name, passcode, members });
  res.json({ message: 'Team roster updated successfully', team: updated });
}, MASTER_ONLY));

// 11. Admin & Marshals: Get all photo submissions
app.get('/api/admin/photo-submissions', route(async (req, res) => {
  res.json(await getAllPhotoSubmissions());
}, PHOTO_STAFF));

// 12. Admin & Marshals: Review photo submission (Approve / Reject)
app.post('/api/admin/photo-submissions/review', route(async (req, res) => {
  const { submissionId, status, comment, teamId, targetIndex } = req.body;
  const result = await reviewPhotoSubmission({ submissionId, status, comment, teamId, targetIndex });
  res.json({ message: `Photo marked as ${status}!`, ...result });
}, PHOTO_STAFF));

// 13. Admin & Marshals: Direct One-Click Station Approval
app.post('/api/admin/marshal/approve', route(async (req, res, auth) => {
  const { teamId, marshalName = 'Station Volunteer', expectedStep } = req.body;
  const result = await completeTeamTask({
    teamId,
    participantName: marshalName,
    method: 'MARSHAL_ONE_CLICK_APPROVAL',
    expectedStep: typeof expectedStep === 'number' ? expectedStep : undefined,
    allowedGames: allowedGamesFor(auth)
  });
  res.json(result);
}, ANY_ADMIN));

// 13b. Admin & Marshals: Direct One-Click Station Denial / Request Retry
app.post('/api/admin/marshal/deny', route(async (req, res, auth) => {
  const { teamId, marshalName = 'Station Volunteer', reason } = req.body;
  res.json(await denyTeamTask({ teamId, marshalName, reason, allowedGames: allowedGamesFor(auth) }));
}, ANY_ADMIN));

// 14. Admin: Generate Printable QR Codes (5 Starting QRs + 6 Game Station QRs) with qr_image.png center logo
app.get('/api/admin/qr-codes', route(async (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  const stations = await getStartingStations();

  const startQrs = await Promise.all(
    stations.map(async (st) => {
      const directUrl = `${baseUrl}/?start_qr=${encodeURIComponent(st.qrCode)}`;
      const { dataUri: qrImage } = await generateQrWithLogo(directUrl, {
        color: { dark: '#2b0a07', light: '#ffffff' }
      });
      return {
        stationId: st.stationId,
        qrCode: st.qrCode,
        allowedTeams: st.allowedTeamNumbers,
        locationHint: st.locationHint,
        directUrl,
        qrImage
      };
    })
  );

  const gameNames = ['Hot & Cold', 'Jigsaw', 'Photo Game', 'Movie Game', 'Boat Game', 'Final Game'];
  const gameQrs = await Promise.all(
    gameNames.map(async (gName) => {
      const details = GAME_DETAILS[gName];
      const { dataUri: qrImage } = await generateQrWithLogo(details.qrCode, {
        color: { dark: '#2b0a07', light: '#ffffff' }
      });
      return {
        gameName: gName,
        title: details.clueTitle, // Uses mysterious title on the printable card
        locationHint: details.crypticHint,
        qrCode: details.qrCode,
        qrImage
      };
    })
  );

  res.json({ startQrs, gameQrs });
}, MASTER_ONLY));

// 14b. Admin: Get current starting stations configuration
app.get('/api/admin/stations', route(async (req, res) => {
  res.json(await getStartingStations());
}, MASTER_ONLY));

// 14c. Admin: Dynamically reassign teams or edit a starting station (Master Only)
app.post('/api/admin/stations/update', route(async (req, res) => {
  const { stationId, allowedTeamNumbers, locationHint, qrCode } = req.body;
  if (!stationId) throw new HttpError(400, 'Station ID is required.');
  const updated = await updateStartingStation(stationId, { allowedTeamNumbers, locationHint, qrCode });
  res.json({ message: 'Station configuration updated successfully', station: updated });
}, MASTER_ONLY));

// 15. Admin: Reset single team or all teams (Master Only)
app.post('/api/admin/reset', route(async (req, res) => {
  const { teamId, all } = req.body;
  if (all) {
    await resetAllTeams();
    return res.json({ message: 'All 10 teams reset to starting state.' });
  }
  if (teamId) {
    await resetTeam(teamId);
    return res.json({ message: `Team ${teamId} reset to starting state.` });
  }
  throw new HttpError(400, 'Please specify teamId or all: true.');
}, MASTER_ONLY));

export default app;
