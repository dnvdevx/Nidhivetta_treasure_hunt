# THANIMA: Nidhiveta Treasure Hunt (KERALAM)

A full-stack, mobile-friendly treasure hunt web application designed for **Thanima** (the Kerala cultural festival). Teams decipher clues scattered across campus to collect all 7 letters of **K-E-R-A-L-A-M**, scanning station QR codes to unlock the next destination and compete on the live leaderboard.

---

## 🌟 Key Features

1. **Role-Based Onboarding & Team Flow**:
   - **Leader Creation**: One teammate creates the team with a unique Team Name, optional passcode, and adds their teammates' names & student register numbers (e.g. `23BCE1001`).
   - **Teammate Access**: Teammates easily log into the team by simply entering their **Team Name**, their **Register Number**, and their **Name**.
2. **K-E-R-A-L-A-M Progress Tracking**:
   - 7 progressive stages for each letter (`K`, `E`, `R`, `A`, `L`, `A`, `M`).
   - Real-time score calculation (+150 pts per clue discovered).
3. **In-Browser Camera QR Code Scanner**:
   - Fast, automatic camera QR reader (`html5-qrcode`) with autofocus and rear-camera support.
   - Fallback manual code input if camera access is restricted.
   - Intelligent validation: prevents scanning out of sequence or scanning already found letters.
4. **Live Leaderboard**:
   - Auto-updating standings ranked by letters found, completion speed, and points.
5. **Organizers / Admin Desk**:
   - Open `/game_admin` and sign in with a master organizer password or a station passcode.
   - Instant printable QR code stations with high-resolution QR images for physical placement.
   - Quick-reset capability for testing or stage re-runs.
6. **Vercel + Upstash Redis**:
   - Works immediately out-of-the-box locally with a built-in JSON file store.
   - In production, all game state lives in **Upstash Redis**, shared by every serverless instance.
   - Configured for Vercel Serverless Functions (`/api`).

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Frontend + Backend Concurrently
```bash
npm run dev
```
- **Web App**: http://localhost:5173
- **API Server**: http://localhost:5000 (proxied via Vite)

---

## 🗄️ Production Database (Upstash Redis) — required on Vercel

Vercel runs the API as serverless functions that do **not** share a filesystem. Without a shared
database every instance keeps its own copy of the game and team progress appears to jump backwards.

1. In the Vercel dashboard open the project → **Storage** → **Create Database** → **Upstash Redis** (free tier is enough).
2. Connect it to this project for all environments. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically
   (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` also work).
3. Redeploy, then open `/api/health` — `database` must say `Upstash Redis (shared)`.

---

## ☁️ Deploying to Vercel

1. Push this repository to GitHub (keep the repository **private**: it contains station QR codes and boat codes).
2. In Vercel, click **Add New... -> Project** and import your repository.
3. In the project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables:
   - `JWT_SECRET` — a long random string.
   - `MASTER_ADMIN_PASSWORDS` — comma-separated master organizer passwords.
   - Optional station passcode overrides: `STATION_PASSCODE_HOT_N_COLD`, `STATION_PASSCODE_JIGSAW`,
     `STATION_PASSCODE_PHOTO_GAME`, `STATION_PASSCODE_MOVIE_GAME`, `STATION_PASSCODE_BOAT_GAME`, `STATION_PASSCODE_FINAL_GAME`.
5. Connect Upstash Redis (see above) and click **Deploy**!
   - Your frontend will be served statically from the global CDN edge.
   - Requests to `/api/*` will automatically be routed to the Serverless Function in `/api/index.js`.

---

## 📍 Default Station Clues (K-E-R-A-L-A-M)

| Step | Letter | Title | Station Location | QR Code Token |
|:---:|:---:|:---|:---|:---|
| 0 | **K** | The Heritage Gateway | Main Block Entrance / Reception | `THANIMA-KERALAM-K-9481` |
| 1 | **E** | Echoes of Wisdom | Central Library Ground Floor | `THANIMA-KERALAM-E-4217` |
| 2 | **R** | Rhythm of the Waters | Campus Lake / Fountain Area | `THANIMA-KERALAM-R-8832` |
| 3 | **A** | Arena of Champions | Sports Complex / Courts | `THANIMA-KERALAM-A-1590` |
| 4 | **L** | Laboratories of Tomorrow | Academic Block Tech Hub | `THANIMA-KERALAM-L-7364` |
| 5 | **A** | Aroma of Feasts | Food Court / Gazebo Area | `THANIMA-KERALAM-A-6025` |
| 6 | **M** | The Final Crown (Makutam) | Thanima Main Stage / Auditorium | `THANIMA-KERALAM-M-3148` |

*(Organizers can also generate custom QR tokens directly from `server/tasksData.js`.)*
