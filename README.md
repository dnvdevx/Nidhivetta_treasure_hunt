# THANIMA: Nidhivetta Treasure Hunt (KERALAM)

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
   - Accessible via secret passcode (`thanima-admin-2026`).
   - Instant printable QR code stations with high-resolution QR images for physical placement.
   - Quick-reset capability for testing or stage re-runs.
6. **Vercel & Supabase Ready**:
   - Works immediately out-of-the-box locally with a built-in JSON adapter.
   - Connects seamlessly to **Supabase PostgreSQL** in production.
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

## 🗄️ Supabase Setup (Production Database)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** tab in your Supabase Dashboard.
3. Copy and run the entire script in [supabase/schema.sql](supabase/schema.sql).
4. Go to **Project Settings -> API** and copy:
   - `Project URL`
   - `anon public` key (or `service_role` secret)
5. Add these to your `.env` or Vercel Environment Variables:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
JWT_SECRET=your-secure-jwt-secret
ADMIN_KEY=thanima-admin-2026
```

---

## ☁️ Deploying to Vercel

1. Push this repository to GitHub.
2. In Vercel, click **Add New... -> Project** and import your repository.
3. In the project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add your Environment Variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `JWT_SECRET`, `ADMIN_KEY`).
5. Click **Deploy**!
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

*(Organizers can also generate custom QR tokens directly from `server/tasksData.js` or through the Supabase `tasks` table!)*
