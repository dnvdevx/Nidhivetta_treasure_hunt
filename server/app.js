import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import {
  getTeamById,
  getAllTeams,
  verifyEntryScan,
  advanceTeamTaskByQR,
  completeTeamTask,
  getTeamCurrentTask,
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
  denyTeamTask,
  advanceTeamToStep,
  isSupabaseConfigured
} from './db.js';
import {
  STARTING_STATIONS,
  GAME_DETAILS,
  TEAM_GAME_SCHEDULE,
  MASTER_ADMIN_PASSWORDS,
  GAME_STATION_PASSCODES,
  verifyAdminOrStationPasscode
} from './scheduleData.js';
import { generateQrWithLogo } from './qrHelper.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'thanima-nidhivetta-secret-key-2026';

// Helper to authenticate Master Organizers or Game Station Volunteers
export function checkAdminAuth(req, isMasterOnly = false) {
  const key = req.body?.adminKey || req.query?.key || req.headers['x-admin-key'];
  const result = verifyAdminOrStationPasscode(key);
  if (!result.valid) {
    return { ok: false, status: 403, error: 'Unauthorized. Invalid Organizer or Station Passcode.' };
  }
  if (isMasterOnly && !result.isMaster) {
    return { ok: false, status: 403, error: 'Master Organizer privileges required for this action.' };
  }
  return { ok: true, auth: result };
}

const app = express();

app.use(cors());
// Support base64 image uploads for Photo Game (up to 15mb)
app.use(express.json({ limit: '15mb' }));
// Serve printable sheets and QR assets
app.use('/qrs', express.static(path.join(__dirname, '../qrs')));

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
    database: isSupabaseConfigured ? 'Supabase PostgreSQL' : 'Local JSON Store',
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
app.post('/api/entry/scan', async (req, res) => {
  try {
    const { stationQr, passcode, regNo, memberId } = req.body;

    if (!stationQr || !passcode) {
      return res.status(400).json({ error: 'Station QR code and Team Passcode are required.' });
    }

    const result = await verifyEntryScan({ stationQr, passcode, regNo, memberId });
    const { team, member, currentTask } = result;

    const token = jwt.sign(
      {
        teamId: team.id,
        teamNumber: team.team_number,
        teamName: team.name,
        memberId: member.id,
        memberName: member.name,
        regNo: member.reg_no
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
  } catch (err) {
    console.error('Error in /api/entry/scan:', err);
    res.status(400).json({ error: err.message });
  }
});

// 4. Get Current Team state & dynamically resolved task clue
app.get('/api/teams/me', authenticateToken, async (req, res) => {
  try {
    const team = await getTeamById(req.user.teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found.' });
    }

    const currentTask = getTeamCurrentTask(team);
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4b. Sync / restore team progress from verified client (heals ephemeral serverless instances)
app.post('/api/teams/sync-progress', authenticateToken, async (req, res) => {
  try {
    const { step } = req.body;
    if (typeof step !== 'number' || step < 0 || step > 7) {
      return res.status(400).json({ error: 'Valid step number required' });
    }

    const team = await getTeamById(req.user.teamId);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    if (step > (team.current_step || 0)) {
      await advanceTeamToStep(team.id, step);
    }

    const updated = await getTeamById(req.user.teamId);
    const currentTask = getTeamCurrentTask(updated);

    res.json({ success: true, team: updated, currentTask });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Scan Station QR Code for in-game challenge
app.post('/api/tasks/scan', authenticateToken, async (req, res) => {
  try {
    const { qrCode } = req.body;
    if (!qrCode || typeof qrCode !== 'string') {
      return res.status(400).json({ error: 'QR Code value is required.' });
    }

    const result = await advanceTeamTaskByQR({
      teamId: req.user.teamId,
      participantId: req.user.memberId,
      participantName: req.user.memberName,
      scannedCode: qrCode
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (err) {
    console.error('Error in /api/tasks/scan:', err);
    res.status(500).json({ error: err.message || 'Verification failed.' });
  }
});

// 6. PHOTO GAME: Submit photo
app.post('/api/photo-game/submit', authenticateToken, async (req, res) => {
  try {
    const { targetIndex, imageUrl } = req.body;

    if (typeof targetIndex !== 'number' || !imageUrl) {
      return res.status(400).json({ error: 'Target index and photo image are required.' });
    }

    const submission = await submitPhotoTarget({
      teamId: req.user.teamId,
      targetIndex,
      imageUrl,
      participantName: req.user.memberName
    });

    const team = await getTeamById(req.user.teamId);
    const currentTask = getTeamCurrentTask(team);

    res.json({
      message: 'Photo submitted to the Station Marshal for review!',
      submission,
      photoGameState: currentTask.photoGameState
    });
  } catch (err) {
    console.error('Error in /api/photo-game/submit:', err);
    res.status(400).json({ error: err.message });
  }
});

// 7. PHOTO GAME: Skip photo target to reveal next target (max 2 skips)
app.post('/api/photo-game/skip', authenticateToken, async (req, res) => {
  try {
    const result = await skipPhotoTarget({ teamId: req.user.teamId });
    res.json(result);
  } catch (err) {
    console.error('Error in /api/photo-game/skip:', err);
    res.status(400).json({ error: err.message });
  }
});

// 8a. BOAT GAME: Step 1 - Unlock question using Question Boat Code
app.post('/api/boat-game/unlock-question', authenticateToken, async (req, res) => {
  try {
    const { questionCode } = req.body;
    if (!questionCode) {
      return res.status(400).json({ error: 'Question boat code is required.' });
    }

    const result = await unlockBoatQuestion({
      teamId: req.user.teamId,
      questionCode
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (err) {
    console.error('Error in /api/boat-game/unlock-question:', err);
    res.status(400).json({ error: err.message || 'Failed to unlock question.' });
  }
});

// 8b. BOAT GAME: Step 2 - Verify 6-character alphanumeric answer boat code
app.post('/api/boat-game/verify', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Boat answer code is required.' });
    }

    const result = await verifyBoatCode({
      teamId: req.user.teamId,
      code,
      participantName: req.user.memberName,
      participantId: req.user.memberId
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (err) {
    console.error('Error in /api/boat-game/verify:', err);
    res.status(400).json({ error: err.message || 'Verification failed.' });
  }
});

// 8c. BOAT GAME: Get the 5 Campus Locations & Riddles
app.get('/api/boat-game/locations', async (req, res) => {
  try {
    const locations = await getBoatLocations();
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    icon: result.icon,
    stationPasscodes: result.isMaster ? GAME_STATION_PASSCODES : undefined
  });
});

// 9. Admin: Get 10 Boat Game Questions & Codes (20 Boats: 10 Question Boats + 10 Answer Boats)
app.get('/api/admin/boat-questions', async (req, res) => {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    const questions = await getBoatQuestions();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Admin: Update a Boat Game Question/Answer/Codes (Master Only)
app.post('/api/admin/boat-questions/update', async (req, res) => {
  const auth = checkAdminAuth(req, true);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    const { teamNumber, question, answer, questionCode, answerCode, code } = req.body;
    const updated = await updateBoatQuestion(teamNumber, {
      question,
      answer,
      questionCode,
      answerCode,
      code
    });
    res.json({ message: 'Boat challenge updated', question: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10b. Admin: Release/clear a team's Question Boat claim
app.post('/api/admin/boat-questions/clear-claim', async (req, res) => {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    const { teamId, questionBoatNumber } = req.body;
    const target = questionBoatNumber || teamId;
    const cleared = await clearBoatClaim(target);
    res.json({ message: 'Boat claim released successfully', team: cleared });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Live Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Admin: Get all 10 teams and rosters
app.get('/api/admin/teams', async (req, res) => {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    const teams = await getAllTeams();
    res.json({ teams, schedules: TEAM_GAME_SCHEDULE });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Admin: Update team roster / passcode (Master Only)
app.post('/api/admin/teams/update', async (req, res) => {
  const auth = checkAdminAuth(req, true);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    const { teamId, name, passcode, members } = req.body;
    const updated = await updateTeamRoster(teamId, { name, passcode, members });
    res.json({ message: 'Team roster updated successfully', team: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Admin & Marshals: Get all photo submissions
app.get('/api/admin/photo-submissions', async (req, res) => {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    const submissions = await getAllPhotoSubmissions();
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Admin & Marshals: Review photo submission (Approve / Reject)
app.post('/api/admin/photo-submissions/review', async (req, res) => {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    const { submissionId, status, comment, teamId, targetIndex } = req.body;
    const result = await reviewPhotoSubmission({ submissionId, status, comment, teamId, targetIndex });
    res.json({
      message: `Photo marked as ${status}!`,
      ...result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Admin & Marshals: Direct One-Click Station Approval
app.post('/api/admin/marshal/approve', async (req, res) => {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    const { teamId, marshalName = 'Station Volunteer' } = req.body;
    const result = await completeTeamTask({
      teamId,
      participantName: marshalName,
      method: 'MARSHAL_ONE_CLICK_APPROVAL'
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13b. Admin & Marshals: Direct One-Click Station Denial / Request Retry
app.post('/api/admin/marshal/deny', async (req, res) => {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    const { teamId, marshalName = 'Station Volunteer', reason } = req.body;
    const result = await denyTeamTask({ teamId, marshalName, reason });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Admin: Generate Printable QR Codes (5 Starting QRs + 6 Game Station QRs) with qr_image.png center logo
app.get('/api/admin/qr-codes', async (req, res) => {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14b. Admin: Get current starting stations configuration
app.get('/api/admin/stations', async (req, res) => {
  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    const stations = await getStartingStations();
    res.json(stations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14c. Admin: Dynamically reassign teams or edit a starting station (Master Only)
app.post('/api/admin/stations/update', async (req, res) => {
  const auth = checkAdminAuth(req, true);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    const { stationId, allowedTeamNumbers, locationHint, qrCode } = req.body;
    if (!stationId) {
      return res.status(400).json({ error: 'Station ID is required.' });
    }
    const updated = await updateStartingStation(stationId, {
      allowedTeamNumbers,
      locationHint,
      qrCode
    });
    res.json({ message: 'Station configuration updated successfully', station: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Admin: Reset single team or all teams (Master Only)
app.post('/api/admin/reset', async (req, res) => {
  const auth = checkAdminAuth(req, true);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    const { teamId, all } = req.body;
    if (all) {
      await resetAllTeams();
      return res.json({ message: 'All 10 teams reset to starting state.' });
    }
    if (teamId) {
      await resetTeam(teamId);
      return res.json({ message: `Team ${teamId} reset to starting state.` });
    }
    res.status(400).json({ error: 'Please specify teamId or all: true.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
