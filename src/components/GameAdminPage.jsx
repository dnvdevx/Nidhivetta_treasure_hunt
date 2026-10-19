import React, { useState, useEffect } from 'react';
import { getTeamPhotoTargets } from '../utils/photoTargets';

// Station definitions & themes
const STATIONS = [
  { id: 'Hot n Cold', name: 'Hot n Cold', description: 'Football/racket courts colour hunt' },
  { id: 'Jigsaw', name: 'Jigsaw', description: 'Envelope & puzzle piece decoding' },
  { id: 'Photo Game', name: 'Photo Game', description: '3 campus locations full photo capture' },
  { id: 'Movie Game', name: 'Movie Game', description: 'Ladies hostel milk stall movie trivia' },
  { id: 'Boat Game', name: 'Boat Game', description: '5-harbor 20-boat fleet trial' },
  { id: 'Final Game', name: 'Final Game', description: 'Main stage sprint & Makutam crown' }
];

const TEAM_TREE_NUMBERS = {
  1: { letter: 'ഝ', number: 24, sittingArea: null },
  2: { letter: 'ള', number: 49, sittingArea: null },
  3: { letter: 'ഋ', number: 8, sittingArea: 'North Square sitting area' },
  4: { letter: 'ഫ', number: 37, sittingArea: null },
  5: { letter: 'ഖ', number: 17, sittingArea: 'North Square sitting area' },
  6: { letter: 'ഘ', number: 19, sittingArea: 'Tennis court' },
  7: { letter: 'ദ', number: 33, sittingArea: 'Tennis Court' },
  8: { letter: 'യ', number: 41, sittingArea: 'Tennis Court' },
  9: { letter: 'ട', number: 26, sittingArea: null },
  10: { letter: 'ശ', number: 45, sittingArea: 'Aavin' }
};

const PHOTO_TARGETS = [
  { index: 0, title: 'Location Photo 1', desc: 'Team-specific campus location photo' },
  { index: 1, title: 'Location Photo 2', desc: 'Team-specific campus location photo' },
  { index: 2, title: 'Location Photo 3', desc: 'Team-specific campus location photo' }
];

const CAMPUS_BOAT_LOCATIONS = [
  {
    locationNumber: 1,
    title: 'Location 1: The Gathering Spot (Northwest)',
    riddle: 'Guided by the compass, seek the direction that lies between the setting sun and the midnight hour. Within this part of the campus lies a familiar gathering spot, now featuring a newly created space where one can pause and unwind.',
    boatNumbers: [1, 2]
  },
  {
    locationNumber: 2,
    title: 'Location 2: The Polished Stone Seats',
    riddle: 'Stone-like seats with a polished glow, Where tired feet pause before they go. Not quite a hall, nor a place to read, Between a place of learning and a stage of talents, Lies a resting spot within your reach. Find where glossy rocks serve your needs. Your next clue awaits where people sit.',
    boatNumbers: [3, 4]
  },
  {
    locationNumber: 3,
    title: 'Location 3: Racket & Ripple',
    riddle: 'Shuttles fly on one side, splashes on the other. Find the spot where the racket meets the ripple.',
    boatNumbers: [5, 6]
  },
  {
    locationNumber: 4,
    title: 'Location 4: The Newborn Court',
    riddle: 'Among the old, a newborn stands tall, The youngest member among them all. Seek the place where quick reflexes reign, And a feathered object dances across the terrain.',
    boatNumbers: [7, 8]
  },
  {
    locationNumber: 5,
    title: 'Location 5: The Contours of Nature',
    riddle: "Where the earth wears a crown and the winds whisper tales of youthful adventures, countless moments of joy unfold. A familiar pursuit finds its home where nature's contours take an unexpected turn, inviting those who seek it to look beyond the obvious.",
    boatNumbers: [9, 10]
  }
];

const normalizeGameName = (name) => {
  if (!name) return '';
  const n = String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (n.includes('hot') && n.includes('cold')) return 'hotncold';
  if (n.includes('jigsaw') || n.includes('tree') || n.includes('number')) return 'numbersontrees';
  if (n.includes('photo')) return 'photogame';
  if (n.includes('movie')) return 'moviegame';
  if (n.includes('boat')) return 'boatgame';
  if (n.includes('final') || n.includes('crown') || n.includes('makutam')) return 'finalgame';
  if (n.includes('start') || n.includes('qr') || n.includes('entry')) return 'startingstation';
  return n;
};

// Station Access Codes (Matching organizers' official codes)
const STATION_ACCESS_MAP = {
  'hotncold': 'FLAME#82HC',
  'numbersontrees': 'PIECE#39JS',
  'photogame': 'RELIC#61PG',
  'moviegame': 'CINEMA#82MG',
  'boatgame': 'VALLAM#55BG',
  'finalgame': 'MAKUTAM#99FG'
};

const matchesStation = (currentGame, stationId) => {
  return normalizeGameName(currentGame) === normalizeGameName(stationId);
};

export default function GameAdminPage() {
  const [passcode, setPasscode] = useState(() => sessionStorage.getItem('thanima_admin_pass') || '');
  const [session, setSession] = useState(null); // { role: 'master'|'volunteer', gameName, isMaster, stationPasscodes }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // Unlocked stations for master admin in current session (stored in sessionStorage)
  const [unlockedStations, setUnlockedStations] = useState(() => {
    try {
      const saved = sessionStorage.getItem('thanima_unlocked_stations');
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });

  // Modal challenge state when master clicks a protected station
  const [stationToUnlock, setStationToUnlock] = useState(null);
  const [stationAccessCodeInput, setStationAccessCodeInput] = useState('');
  const [stationUnlockError, setStationUnlockError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Master view active tab: 'stations' | 'teams' | 'boat_fleet' | 'settings'
  const [masterTab, setMasterTab] = useState('stations');
  // Volunteer station being inspected (if master, can switch between any; if volunteer, fixed to their game)
  const [activeStation, setActiveStation] = useState(null);

  // Unlock / Lock helpers
  const unlockStation = (stationName) => {
    setUnlockedStations((prev) => {
      const updated = { ...prev, [stationName]: true };
      try {
        sessionStorage.setItem('thanima_unlocked_stations', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const lockStation = (stationName) => {
    setUnlockedStations((prev) => {
      const updated = { ...prev };
      delete updated[stationName];
      try {
        sessionStorage.setItem('thanima_unlocked_stations', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  // Live Data
  const [teams, setTeams] = useState([]);
  const [photoSubmissions, setPhotoSubmissions] = useState(() => {
    try {
      const cached = localStorage.getItem('thanima_admin_cached_photos');
      return cached ? JSON.parse(cached) : [];
    } catch (_) {
      return [];
    }
  });
  const [boatQuestions, setBoatQuestions] = useState([]);
  const [enlargedPhoto, setEnlargedPhoto] = useState(null);

  // Deny modal state
  const [denyingTeam, setDenyingTeam] = useState(null);
  const [customDenyReason, setCustomDenyReason] = useState('');
  const [resetPasscodeInput, setResetPasscodeInput] = useState('');

  // Perform login with entered passcode
  const handleLogin = async (e, directCode = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const code = directCode || passcode;
    if (!code || !code.trim()) {
      setError('Please enter a passcode.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: code.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed.');

      const sessionObj = {
        key: code.trim(),
        role: data.role,
        isMaster: data.isMaster,
        gameName: data.gameName,
        displayName: data.displayName,
        icon: data.icon,
        stationPasscodes: data.stationPasscodes
      };

      setSession(sessionObj);
      sessionStorage.setItem('thanima_admin_pass', code.trim());

      if (data.role === 'volunteer') {
        setActiveStation(data.gameName);
        unlockStation(data.gameName);
      } else {
        setActiveStation(null); // Master starts on station overview
      }

      await fetchLiveData(code.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Verify Station Access Code when master enters a game section
  const handleVerifyStationAccessCode = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const inputCode = stationAccessCodeInput.trim().toUpperCase();
    if (!inputCode) {
      setStationUnlockError('Please enter the station access code.');
      return;
    }

    if (!stationToUnlock) return;

    setIsUnlocking(true);
    setStationUnlockError('');

    try {
      const targetNorm = normalizeGameName(stationToUnlock.name);
      const expectedCode = STATION_ACCESS_MAP[targetNorm];

      // Check if this access code belongs to a different station
      const otherStationKey = Object.keys(STATION_ACCESS_MAP).find(
        (key) => key !== targetNorm && STATION_ACCESS_MAP[key] === inputCode
      );

      if (otherStationKey) {
        setStationUnlockError(`This access code belongs to a different game station. Please enter the access code for ${stationToUnlock.name}.`);
        setIsUnlocking(false);
        return;
      }

      // 1. Direct validation against expected station code
      if (expectedCode && inputCode === expectedCode) {
        unlockStation(stationToUnlock.name);
        setActiveStation(stationToUnlock.name);
        setStationToUnlock(null);
        setStationAccessCodeInput('');
        setStationUnlockError('');
        showActionToast(`Access verified for ${stationToUnlock.name}!`);
        setIsUnlocking(false);
        return;
      }

      // 2. Server verification via /api/admin/login
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: inputCode })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (
          matchesStation(data.gameName, stationToUnlock.name) ||
          matchesStation(data.displayName, stationToUnlock.name)
        ) {
          unlockStation(stationToUnlock.name);
          setActiveStation(stationToUnlock.name);
          setStationToUnlock(null);
          setStationAccessCodeInput('');
          setStationUnlockError('');
          showActionToast(`Access verified for ${stationToUnlock.name}!`);
        } else {
          setStationUnlockError(`This access code is for ${data.displayName || data.gameName}. Please enter the code for ${stationToUnlock.name}.`);
        }
      } else {
        setStationUnlockError(data.error || 'Invalid station access code. Please try again.');
      }
    } catch (err) {
      setStationUnlockError(err.message || 'Verification error. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Fetch all live data for admin / volunteer
  const fetchLiveData = async (activeKey) => {
    const k = activeKey || session?.key;
    if (!k) return;

    try {
      const tRes = await fetch(`/api/admin/teams?key=${encodeURIComponent(k)}`);
      if (tRes.ok) {
        const tData = await tRes.json();
        setTeams(tData.teams || []);
      }

      const pRes = await fetch(`/api/admin/photo-submissions?key=${encodeURIComponent(k)}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        setPhotoSubmissions((prev) => {
          const incoming = Array.isArray(pData) ? pData : [];
          if (incoming.length === 0 && prev.length > 0) return prev;
          const map = new Map();
          (prev || []).forEach((item) => {
            const key = `${item.team_id}-${item.target_index}`;
            map.set(key, item);
          });
          incoming.forEach((item) => {
            const key = `${item.team_id}-${item.target_index}`;
            const existing = map.get(key);
            if (existing) {
              map.set(key, {
                ...existing,
                ...item,
                image_url: item.image_url || existing.image_url
              });
            } else {
              map.set(key, item);
            }
          });
          const merged = Array.from(map.values());
          try {
            localStorage.setItem('thanima_admin_cached_photos', JSON.stringify(merged));
          } catch (_) {}
          return merged;
        });
      }

      const bRes = await fetch(`/api/admin/boat-questions?key=${encodeURIComponent(k)}`);
      if (bRes.ok) {
        const bData = await bRes.json();
        setBoatQuestions(bData || []);
      }
    } catch (_) {}
  };

  // Attempt auto-login if passcode is in sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('thanima_admin_pass');
    if (saved && !session) {
      handleLogin(null, saved);
    }
  }, []);

  // Continuous live refresh every 3.5 seconds
  useEffect(() => {
    if (session) {
      const timer = setInterval(() => {
        fetchLiveData(session.key);
      }, 3500);
      return () => clearInterval(timer);
    }
  }, [session]);

  const showActionToast = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4500);
  };

  // 1-Click Approve Team
  const handleApproveTeam = async (teamId, gameName) => {
    if (!window.confirm('Approve this team? They will immediately advance to their next game station.')) return;

    try {
      const res = await fetch('/api/admin/marshal/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: session.key,
          teamId,
          marshalName: `${gameName || 'Station'} Volunteer`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');

      showActionToast('Team approved! Next trial & letter unlocked.');
      await fetchLiveData(session.key);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Request Retry / Deny Team
  const handleDenyTeam = async () => {
    if (!denyingTeam) return;

    try {
      const res = await fetch('/api/admin/marshal/deny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: session.key,
          teamId: denyingTeam.id,
          marshalName: `${activeStation || denyingTeam.currentGame || 'Station'} Volunteer`,
          reason: customDenyReason || 'Coordinator requested a retry. Please review the rules and retry!'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Denial failed');

      showActionToast(`Notice sent to ${denyingTeam.name}. Team screen updated with retry instructions.`);
      setDenyingTeam(null);
      setCustomDenyReason('');
      await fetchLiveData(session.key);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Review individual photo
  const handleReviewPhoto = async (submissionId, status, extra = {}) => {
    // Immediately update local state so admin UI never flickers
    const targetIdx = Number(extra.targetIndex);
    setPhotoSubmissions((prev) => {
      const next = prev.map((p) => {
        if (p.id === submissionId || (extra.teamId && p.team_id === extra.teamId && Number(p.target_index) === targetIdx)) {
          return { ...p, status };
        }
        return p;
      });
      try {
        localStorage.setItem('thanima_admin_cached_photos', JSON.stringify(next));
      } catch (_) {}
      return next;
    });

    // Also update teams list state immediately so approved_photo_targets matches
    setTeams((prev) => prev.map((t) => {
      if (t.id === extra.teamId || Number(t.team_number) === Number(extra.teamId)) {
        let approved = Array.isArray(t.approved_photo_targets) ? [...t.approved_photo_targets] : [];
        if (status === 'approved') {
          if (!approved.some((idx) => Number(idx) === targetIdx)) {
            approved.push(targetIdx);
          }
        } else if (status === 'rejected') {
          approved = approved.filter((idx) => Number(idx) !== targetIdx);
        }
        return { ...t, approved_photo_targets: approved };
      }
      return t;
    }));

    try {
      const res = await fetch('/api/admin/photo-submissions/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: session.key,
          submissionId,
          status,
          teamId: extra.teamId,
          targetIndex: targetIdx
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Photo review failed');

      showActionToast(
        data.taskCompleted
          ? '3 Photos Approved! Team automatically completed the Photo Game!'
          : `Photo marked as ${status}.`
      );
      await fetchLiveData(session.key);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Release a Question Boat claim
  const handleClearBoatClaim = async (boatNum) => {
    if (!window.confirm(`Release claim on Question Boat #${boatNum}? Any team will be able to claim it again.`)) return;
    try {
      const res = await fetch('/api/admin/boat-questions/clear-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: session.key,
          questionBoatNumber: boatNum
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to release claim');
      showActionToast(`Question Boat #${boatNum} claim released!`);
      await fetchLiveData(session.key);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Reset All 10 Teams
  const handleResetAll = async (confirmCode) => {
    const code = (confirmCode || '').trim();
    if (!code) {
      alert('Please enter the confirmation passcode to reset all teams.');
      return;
    }
    if (
      !window.confirm(
        '⚠️ ARE YOU ABSOLUTELY SURE?\n\nThis will reset ALL 10 teams back to Step 0, clear their scores, timestamps, scans, and photo submissions.\n\nThis cannot be undone!'
      )
    ) {
      return;
    }

    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: code,
          passcode: code,
          masterPassword: code,
          all: true
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      showActionToast('✓ All 10 teams have been reset to Step 0!');
      localStorage.removeItem('thanima_admin_cached_photos');
      setPhotoSubmissions([]);
      setResetPasscodeInput('');
      await fetchLiveData(session.key);
    } catch (err) {
      alert(`Reset Error: ${err.message}`);
    }
  };

  // Reset Single Team
  const handleResetSingleTeam = async (teamId, teamName) => {
    if (!window.confirm(`Reset progress of ${teamName || teamId} to Step 0?`)) return;

    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: session.key,
          passcode: session.key,
          teamId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      showActionToast(`✓ ${teamName || teamId} reset to Step 0!`);
      await fetchLiveData(session.key);
    } catch (err) {
      alert(`Reset Error: ${err.message}`);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('thanima_admin_pass');
    sessionStorage.removeItem('thanima_unlocked_stations');
    setSession(null);
    setPasscode('');
    setActiveStation(null);
    setUnlockedStations({});
    setStationToUnlock(null);
    setStationAccessCodeInput('');
    setStationUnlockError('');
  };

  // ==========================================
  // VIEW 1: SIGN IN SCREEN
  // ==========================================
  if (!session) {
    return (
      <div className="min-h-screen bg-bg text-cream flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-gold/40 bg-card p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle gold glow accent */}
          <div className="absolute -top-16 -right-16 h-36 w-36 rounded-full bg-gold/15 blur-2xl pointer-events-none" />

          <div className="text-center space-y-1">
            <h1 className="font-serif text-2xl sm:text-3xl font-black text-gold tracking-tight">
              THANIMA 2026
            </h1>
            <p className="text-xs uppercase tracking-widest text-white/50 font-semibold">
              Organizers & Game Marshals Desk
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <p className="text-xs text-white/70 text-center leading-relaxed">
              Enter your assigned <strong>Game Station Passcode</strong> or the <strong>Master Organizer Password</strong> to access your station.
            </p>

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/70 p-3 text-xs text-red-200 text-center font-medium">
                {error}
              </div>
            )}

            <div>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter Passcode"
                className="w-full rounded-2xl border border-white/20 bg-inset px-4 py-3.5 text-center text-base tracking-wider text-white placeholder-white/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gold py-3.5 text-sm font-bold text-bg hover:bg-gold/90 active:scale-98 transition shadow-lg disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Station'}
            </button>
          </form>

          {/* Quick guide for volunteers */}
          <div className="mt-6 pt-5 border-t border-white/10 text-xs text-white/50 space-y-2">
            <div className="flex items-start gap-2">
              <span className="font-bold text-gold">•</span>
              <p>
                <strong>Game Volunteers:</strong> Entering your station passcode opens <em>only your game</em> with 1-click approvals for zero confusion.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-gold">•</span>
              <p>
                <strong>Master Organizers:</strong> Common password unlocks master dashboard; each game station requires its station access code to enter.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Current station teams (filtered live)
  const currentStationTeams = activeStation
    ? teams.filter((t) => matchesStation(t.currentGame, activeStation))
    : [];

  return (
    <div className="min-h-screen bg-bg text-cream font-sans pb-16">
      {/* Top Global Header */}
      <header className="sticky top-0 z-40 border-b border-gold/20 bg-bg/95 backdrop-blur-md px-4 sm:px-6 py-3.5 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="font-serif text-lg font-bold text-gold">
                {session.isMaster ? 'Master Command Desk' : `${activeStation} Volunteer Desk`}
              </h2>
              <p className="text-[11px] text-white/50">
                {session.isMaster ? 'Head Organizer Access' : `${activeStation} Coordinator Portal`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* If master is inside a station view, allow going back or locking station */}
            {session.isMaster && activeStation && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveStation(null)}
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition active:scale-95"
                >
                  ← All Stations
                </button>
                <button
                  onClick={() => {
                    lockStation(activeStation);
                    setActiveStation(null);
                  }}
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition active:scale-95 flex items-center gap-1"
                  title="Lock station and exit"
                >
                  <span>🔒</span>
                  <span className="hidden sm:inline">Lock Station</span>
                </button>
              </div>
            )}

            {/* Master instant Reset Hunt button */}
            {session.isMaster && (
              <button
                onClick={() => {
                  setActiveStation(null);
                  setMasterTab('reset');
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 flex items-center gap-1.5 border ${
                  masterTab === 'reset' && !activeStation
                    ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30'
                    : 'border-red-500/40 bg-red-950/40 text-red-300 hover:bg-red-900/60 hover:text-white'
                }`}
                title="Reset Hunt Progress"
              >
                <span>⚠️</span>
                <span>Reset Hunt</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="rounded-xl border border-white/20 bg-inset px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white hover:border-red-400/50 transition active:scale-95"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Action Toast Notification */}
      {actionMsg && (
        <div className="fixed top-16 right-4 left-4 sm:left-auto sm:max-w-sm z-50 rounded-2xl border border-gold/50 bg-card p-3.5 text-xs font-bold text-gold shadow-2xl">
          {actionMsg}
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-5">
        {/* ========================================================= */}
        {/* VIEW 2: VOLUNTEER STATION DESK (Ultra-clean, zero clutter) */}
        {/* ========================================================= */}
        {activeStation ? (
          <div className="space-y-5">
            {/* Station Overview Banner */}
            <div className="rounded-3xl border border-gold/30 bg-card p-5 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-gold font-bold block">
                  Station Volunteer On Duty
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-black text-white mt-0.5">
                  {activeStation}
                </h3>
                <p className="text-xs text-white/60 mt-1">
                  Approve teams who complete this round or request a retry. Real-time updates automatically refresh below.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-inset border border-white/10 px-4 py-2.5 text-center">
                  <span className="text-[10px] uppercase text-white/50 block font-bold">Teams Here Now</span>
                  <span className="font-mono text-2xl font-black text-gold">
                    {currentStationTeams.length}
                  </span>
                </div>
              </div>
            </div>

            {/* When NO teams are at this station */}
            {currentStationTeams.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/20 bg-card/50 p-10 text-center space-y-3">
                <span className="text-4xl block">⏳</span>
                <h4 className="font-serif text-lg font-bold text-white/80">
                  No teams are currently at the {activeStation} station
                </h4>
                <p className="text-xs text-white/50 max-w-md mx-auto leading-relaxed">
                  Teams are completing earlier rounds on campus. When a team finishes their prior trial, they will arrive here automatically.
                </p>
              </div>
            ) : normalizeGameName(activeStation) === 'photogame' ? (
              /* ======================================= */
              /* SPECIAL PHOTO GAME VOLUNTEER INTERFACE  */
              /* ======================================= */
              <div className="space-y-4">
                {currentStationTeams.map((team) => {
                  const teamPhotos = photoSubmissions.filter(
                    (p) => p.team_id === team.id || Number(p.team_number) === Number(team.team_number)
                  );
                  const rejectedIndices = new Set(
                    teamPhotos.filter((p) => p.status === 'rejected').map((p) => Number(p.target_index))
                  );
                  const validApprovedTargets = (team.approved_photo_targets || []).filter(
                    (idx) => !rejectedIndices.has(Number(idx))
                  );
                  const approvedCount = Math.max(
                    teamPhotos.filter((p) => p.status === 'approved' && !rejectedIndices.has(Number(p.target_index))).length,
                    validApprovedTargets.length
                  );

                  return (
                    <div
                      key={team.id}
                      className="rounded-3xl border border-gold/40 bg-card p-5 sm:p-6 space-y-5 shadow-2xl"
                    >
                      {/* Team Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold text-bg text-xs font-black">
                              {team.team_number}
                            </span>
                            <h4 className="font-serif text-2xl font-black text-gold">
                              {team.name}
                            </h4>
                          </div>
                          <p className="text-xs text-white/60 mt-1">
                            Players: {(team.members || []).map((m) => m.name).join(', ') || 'Roster pending'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-inset px-3 py-1.5 border border-white/10 text-center">
                            <span className="text-[10px] text-white/50 block font-bold uppercase">Approved</span>
                            <span className="font-mono text-sm font-black text-gold">
                              {approvedCount} / 3
                            </span>
                          </div>

                          {/* 1-Click Overall Approval */}
                          <button
                            onClick={() => handleApproveTeam(team.id, 'Photo Game')}
                            className="rounded-2xl bg-gold hover:bg-gold/90 text-bg px-4 py-2.5 text-xs font-black active:scale-95 transition shadow-xl flex items-center gap-1.5"
                          >
                            Overall Game Approval ➔
                          </button>
                        </div>
                      </div>

                      {/* Photo Relics Grid */}
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-white/70 mb-3">
                          Relic Photo Submissions (Review each below):
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {getTeamPhotoTargets(team.team_number).map((tgt) => {
                            const sub = teamPhotos.find((p) => Number(p.target_index) === Number(tgt.index));
                            const isRejected = sub?.status === 'rejected';
                            const isApproved =
                              !isRejected &&
                              (sub?.status === 'approved' ||
                                Boolean(team.approved_photo_targets?.some((idx) => Number(idx) === Number(tgt.index))));
                            const isPending = !isApproved && !isRejected && sub?.status === 'pending';

                            return (
                              <div
                                key={tgt.index}
                                className={`rounded-2xl border p-3.5 flex flex-col justify-between gap-3 transition ${
                                  isApproved
                                    ? 'border-emerald-500/60 bg-emerald-950/30'
                                    : isPending
                                    ? 'border-amber-500/60 bg-amber-950/30 shadow-lg'
                                    : isRejected
                                    ? 'border-red-500/50 bg-red-950/30'
                                    : 'border-white/10 bg-inset/60 opacity-60'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1 mb-2">
                                    <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                                      Target #{tgt.index + 1}
                                    </span>
                                    {isApproved && (
                                      <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                                        Approved
                                      </span>
                                    )}
                                    {isPending && (
                                      <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full animate-pulse">
                                        Under Review
                                      </span>
                                    )}
                                    {isRejected && (
                                      <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                                        Rejected
                                      </span>
                                    )}
                                  </div>

                                  <h6 className="font-serif font-bold text-sm text-white leading-snug">
                                    {tgt.locationName || tgt.title}
                                  </h6>

                                  {/* Side-by-side Clue vs Submission */}
                                  <div className="mt-2.5 flex items-center gap-2">
                                    {/* Clue thumbnail */}
                                    {tgt.clueImage && (
                                      <div className="relative group flex-1">
                                        <img
                                          src={tgt.clueImage}
                                          alt="Clue"
                                          onClick={() => setEnlargedPhoto(tgt.clueImage)}
                                          className="h-24 w-full rounded-xl object-cover border border-gold/40 cursor-pointer shadow hover:opacity-85"
                                        />
                                        <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] font-bold text-gold text-center py-0.5 rounded-b-xl">
                                          Clue (Detail)
                                        </span>
                                      </div>
                                    )}

                                    {/* Uploaded photo */}
                                    <div className="relative group flex-1">
                                      {sub?.image_url ? (
                                        <>
                                          <img
                                            src={sub.image_url}
                                            alt={tgt.title}
                                            onClick={() => setEnlargedPhoto(sub.image_url)}
                                            className="h-24 w-full rounded-xl object-cover border border-white/20 cursor-pointer shadow hover:opacity-85"
                                          />
                                          <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] font-bold text-white/90 text-center py-0.5 rounded-b-xl">
                                            Team Upload
                                          </span>
                                        </>
                                      ) : (
                                        <div className="h-24 w-full rounded-xl border border-dashed border-white/20 bg-inset flex flex-col items-center justify-center text-[10px] text-white/30 text-center p-2">
                                          <span>Not uploaded</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {sub?.participant_name && (
                                    <p className="text-[10px] text-white/50 mt-1.5">
                                      Uploaded by {sub.participant_name}
                                    </p>
                                  )}
                                </div>

                                {sub && (
                                  <div className="mt-2 flex items-center gap-1.5 pt-2 border-t border-white/10">
                                    <button
                                      onClick={() => handleReviewPhoto(sub.id, 'approved', { teamId: team.id, targetIndex: tgt.index })}
                                      className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-1.5 text-xs font-bold text-white shadow transition active:scale-95"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleReviewPhoto(sub.id, 'rejected', { teamId: team.id, targetIndex: tgt.index })}
                                      className="flex-1 rounded-xl bg-red-800 hover:bg-red-700 py-1.5 text-xs font-bold text-white shadow transition active:scale-95"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ========================================================== */
              /* STANDARD GAME STATIONS (Hot n Cold, Jigsaw, Movie, Boat, Final) */
              /* ========================================================== */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentStationTeams.map((team) => (
                  <div
                    key={team.id}
                    className="rounded-3xl border border-gold/40 bg-card p-5 sm:p-6 space-y-4 shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-bg text-xs font-black">
                            {team.team_number}
                          </span>
                          <h4 className="font-serif text-xl font-bold text-gold">
                            {team.name}
                          </h4>
                        </div>
                        <p className="text-xs text-white/50 mt-1">
                          Passcode: <code className="font-mono text-gold font-bold">{team.passcode}</code>
                        </p>
                      </div>

                      <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1 text-xs font-bold">
                        Present Here
                      </span>
                    </div>

                    <div className="text-xs text-white/70 space-y-1">
                      <span className="text-[10px] uppercase text-white/40 font-bold block">
                        Team Roster (4 Players):
                      </span>
                      <p className="text-white font-medium leading-relaxed">
                        {(team.members || []).map((m) => m.name).join(', ') || 'Roster pending'}
                      </p>
                    </div>

                    {/* Jigsaw Envelope & Answer Reference for Coordinators */}
                    {normalizeGameName(activeStation) === 'numbersontrees' && TEAM_TREE_NUMBERS[team.team_number] && (
                      <div className="rounded-2xl border border-gold/40 bg-inset p-3 space-y-1 shadow-inner">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/60 font-medium">Assigned Letter:</span>
                          <span className="font-serif font-black text-gold text-lg">
                            {TEAM_TREE_NUMBERS[team.team_number].letter}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                          <span className="text-white/60 font-medium">Envelope Number:</span>
                          <span className="font-mono font-black text-emerald-400 text-base">
                            #{TEAM_TREE_NUMBERS[team.team_number].number}
                          </span>
                        </div>
                        {TEAM_TREE_NUMBERS[team.team_number].sittingArea && (
                          <div className="text-[11px] text-white/50 pt-1">
                            Area: <strong className="text-white">{TEAM_TREE_NUMBERS[team.team_number].sittingArea}</strong>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Active Retry Notice if sent */}
                    {team.marshal_feedback && (
                      <div className="rounded-2xl border border-red-500/40 bg-red-950/60 p-3 text-xs text-red-200 space-y-0.5">
                        <span className="font-bold text-red-300">Active Retry Notice: </span>
                        <p>"{team.marshal_feedback.reason}"</p>
                      </div>
                    )}

                    {/* Big Touch-Friendly Action Buttons */}
                    <div className="pt-2 flex items-center gap-2.5">
                      <button
                        onClick={() => handleApproveTeam(team.id, activeStation)}
                        className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-500 py-3.5 text-xs sm:text-sm font-bold text-white shadow-xl active:scale-95 transition flex items-center justify-center gap-2"
                      >
                        Approve Team & Advance
                      </button>
                      <button
                        onClick={() => setDenyingTeam(team)}
                        className="rounded-2xl bg-red-950/70 hover:bg-red-900 border border-red-500/40 px-4 py-3.5 text-xs font-bold text-red-300 active:scale-95 transition"
                      >
                        Request Retry
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ========================================================= */
          /* VIEW 3: MASTER ORGANIZER DASHBOARD (Clean 3-Tab Overview)  */
          /* ========================================================= */
          <div className="space-y-6">
            {/* Master Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 text-xs font-bold">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setMasterTab('stations')}
                  className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
                    masterTab === 'stations' ? 'bg-gold text-bg' : 'bg-inset text-white/70 hover:text-white'
                  }`}
                >
                  Game Stations
                </button>
                <button
                  onClick={() => setMasterTab('teams')}
                  className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
                    masterTab === 'teams' ? 'bg-gold text-bg' : 'bg-inset text-white/70 hover:text-white'
                  }`}
                >
                  All 10 Teams
                </button>
                <button
                  onClick={() => setMasterTab('boat_fleet')}
                  className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
                    masterTab === 'boat_fleet' ? 'bg-gold text-bg' : 'bg-inset text-white/70 hover:text-white'
                  }`}
                >
                  Boat Fleet (20 Boats)
                </button>
              </div>

              {/* Dedicated Reset Hunt Tab */}
              <button
                onClick={() => setMasterTab('reset')}
                className={`px-4 py-2 rounded-xl transition flex items-center gap-2 font-bold ${
                  masterTab === 'reset'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'bg-red-950/40 text-red-300 border border-red-500/40 hover:bg-red-900/50'
                }`}
              >
                <span>⚠️</span>
                <span>Reset Hunt</span>
              </button>
            </div>

            {/* TAB 1: GAME STATIONS GRID */}
            {masterTab === 'stations' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-gold">Game Stations</h3>
                    <p className="text-xs text-white/60">
                      Select any station to open its coordinator desk and oversee team trials.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {STATIONS.map((st) => {
                    const count = teams.filter((t) => matchesStation(t.currentGame, st.id)).length;
                    const isUnlocked = Boolean(unlockedStations[st.name]);

                    return (
                      <div
                        key={st.id}
                        className={`rounded-3xl border p-5 space-y-4 shadow-xl transition flex flex-col justify-between ${
                          isUnlocked
                            ? 'border-emerald-500/40 bg-card hover:border-emerald-500/70'
                            : 'border-gold/30 bg-card hover:border-gold/60'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold uppercase tracking-wider text-gold/80">Station</span>
                              {isUnlocked ? (
                                <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
                                  ✓ Unlocked
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                                  <span>🔒</span>
                                  <span>Code Required</span>
                                </span>
                              )}
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                count > 0
                                  ? 'bg-gold text-bg font-bold shadow-sm'
                                  : 'bg-inset text-white/40 border border-white/5'
                              }`}
                            >
                              {count} {count === 1 ? 'team' : 'teams'} here
                            </span>
                          </div>

                          <h4 className="font-serif text-lg font-bold text-white">
                            {st.name}
                          </h4>
                          <p className="text-xs text-white/60 leading-relaxed">{st.description}</p>
                        </div>

                        <div className="pt-3 border-t border-white/10">
                          {isUnlocked ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setActiveStation(st.name)}
                                className="flex-1 rounded-xl bg-gold py-2.5 text-xs font-bold text-bg hover:bg-gold/90 active:scale-95 transition shadow-md flex items-center justify-center gap-1.5"
                              >
                                <span>Open Station Desk</span>
                                <span>➔</span>
                              </button>
                              <button
                                onClick={() => lockStation(st.name)}
                                title="Lock station access"
                                className="rounded-xl border border-white/20 bg-inset px-3 py-2.5 text-xs font-bold text-white/60 hover:text-white hover:border-amber-400/50 transition active:scale-95 flex items-center gap-1"
                              >
                                <span>🔒</span>
                                <span className="hidden sm:inline">Lock</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setStationToUnlock(st);
                                setStationAccessCodeInput('');
                                setStationUnlockError('');
                              }}
                              className="w-full rounded-xl bg-gold/15 border border-gold/40 py-2.5 text-xs font-bold text-gold hover:bg-gold hover:text-bg active:scale-95 transition shadow-md flex items-center justify-center gap-1.5"
                            >
                              <span>🔒 Enter Access Code</span>
                              <span>➔</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: ALL 10 TEAMS OVERVIEW */}
            {masterTab === 'teams' && (
              <div className="space-y-4">
                <h3 className="font-serif text-xl font-bold text-gold">10 Teams Live Standings</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.map((t) => {
                    const isFinished = t.isFinished || t.current_step >= 7;

                    return (
                      <div
                        key={t.id}
                        className={`rounded-3xl border p-5 space-y-3 bg-card shadow-lg transition ${
                          isFinished ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-bg text-[11px] font-black">
                                {t.team_number}
                              </span>
                              <h4 className="font-serif text-base font-bold text-gold">{t.name}</h4>
                            </div>
                            <p className="text-[11px] text-white/50 mt-0.5">
                              Passcode: <code className="font-mono text-gold font-bold">{t.passcode}</code>
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-sm font-black text-gold">Step {t.current_step || 0} of 7</span>
                            <span className="text-[10px] text-white/50 block">{isFinished ? 'Conquered' : `${t.current_step || 0} Letters`}</span>
                          </div>
                        </div>

                        {/* Currently Playing Station & Reset Team Button */}
                        <div className="rounded-xl bg-inset p-2.5 flex items-center justify-between border border-white/5">
                          <div>
                            <span className="text-xs text-white/60">Current Trial: </span>
                            <span className="text-xs font-bold text-gold">
                              {isFinished ? 'Completed' : t.currentGame}
                            </span>
                          </div>
                          <button
                            onClick={() => handleResetSingleTeam(t.id, t.name)}
                            className="rounded-lg border border-red-500/30 bg-red-950/40 hover:bg-red-900/60 text-red-300 px-2.5 py-1 text-[11px] font-bold transition active:scale-95 flex items-center gap-1"
                            title="Reset this team to Step 0"
                          >
                            <span>↺</span>
                            <span>Reset</span>
                          </button>
                        </div>

                        <div className="text-xs text-white/60 space-y-0.5">
                          <span className="text-[10px] uppercase text-white/40 font-bold block">Players:</span>
                          <p className="text-white/80 line-clamp-2">
                            {(t.members || []).map((m) => m.name).join(', ') || 'Roster pending'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: BOAT FLEET (20 Boats: 10 Q + 10 A distributed across 5 Campus Locations) */}
            {masterTab === 'boat_fleet' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-gold">20-Boat Fleet Deployment Plan</h3>
                    <p className="text-xs text-white/60">
                      5 Campus Locations • 2 Question Boats per location • 10 Question Boats (1–10) & 10 Answer Boats (11–20)
                    </p>
                  </div>
                  <a
                    href="/qrs/print-boat-tags.html"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-gold/20 border border-gold/40 px-3.5 py-2 text-xs font-bold text-gold hover:bg-gold/30 transition self-start sm:self-auto"
                  >
                    Print 20 Boat Tags
                  </a>
                </div>

                {/* 5 Campus Locations Breakdown */}
                <div className="space-y-6">
                  {CAMPUS_BOAT_LOCATIONS.map((loc) => {
                    const locBoats = boatQuestions.filter((bq) =>
                      loc.boatNumbers.includes(bq.questionBoatNumber || bq.teamNumber)
                    );

                    return (
                      <div
                        key={loc.locationNumber}
                        className="rounded-3xl border border-gold/30 bg-card p-5 space-y-4 shadow-xl"
                      >
                        {/* Location Header */}
                        <div className="border-b border-white/10 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold text-bg text-xs font-black">
                              {loc.locationNumber}
                            </span>
                            <div>
                              <h4 className="font-serif text-base font-bold text-gold">
                                {loc.title}
                              </h4>
                              <span className="text-[10px] text-white/50">
                                Assigned Boats: #{loc.boatNumbers[0]} & #{loc.boatNumbers[1]}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-gold/15 text-gold border border-gold/30 self-start sm:self-auto">
                            2 Question Boats Placed Here
                          </span>
                        </div>

                        {/* Location Riddle */}
                        <div className="rounded-xl bg-inset/90 border border-white/5 p-3 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-white/50 block">
                            Campus Location Clue:
                          </span>
                          <p className="font-serif text-xs text-white/90 italic leading-relaxed">
                            "{loc.riddle}"
                          </p>
                        </div>

                        {/* 2 Question Boats at this Location */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                          {locBoats.map((bq) => {
                            const qNum = bq.questionBoatNumber || bq.teamNumber;
                            const isClaimed = Boolean(bq.claimedByTeamId || bq.claimedByTeamName);

                            return (
                              <div
                                key={qNum}
                                className={`rounded-2xl border p-4 space-y-3 transition ${
                                  isClaimed
                                    ? 'border-amber-500/50 bg-[#2b180a]/80 shadow-lg'
                                    : 'border-white/10 bg-inset/60'
                                }`}
                              >
                                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-white">
                                      Question Boat #{qNum}
                                    </span>
                                    {isClaimed ? (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        Claimed
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        Free
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono text-xs font-bold bg-gold/20 text-gold px-2 py-0.5 rounded border border-gold/30">
                                    Code: {bq.questionCode}
                                  </span>
                                </div>

                                <p className="text-xs text-white/85 italic font-serif leading-relaxed line-clamp-3">
                                  "{bq.question}"
                                </p>

                                <div className="pt-2 border-t border-white/10 space-y-1.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-emerald-400 font-bold text-[11px]">
                                      Answer Boat #{bq.answerBoatNumber || qNum + 10}
                                    </span>
                                    <span className="font-mono text-xs font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                                      Code: {bq.answerCode || bq.code}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-white/70">
                                    Answer: <strong className="text-emerald-300">{bq.answer}</strong>
                                  </p>
                                </div>

                                {isClaimed && (
                                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                                    <span className="text-[10px] text-amber-300">
                                      Claimed by: <strong>{bq.claimedByTeamName || `Team ${bq.claimedByTeamId}`}</strong>
                                    </span>
                                    <button
                                      onClick={() => handleClearBoatClaim(qNum)}
                                      className="text-[10px] text-red-300 underline hover:text-red-200"
                                    >
                                      Release Claim
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: RESET HUNT CONTROL CENTER */}
            {masterTab === 'reset' && (
              <div className="space-y-6 max-w-3xl">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-red-400 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>Hunt Progress Reset Control</span>
                  </h3>
                  <p className="text-xs text-white/70 mt-1 leading-relaxed">
                    Safely reset all 10 teams or an individual team's progress back to Step 0.
                  </p>
                </div>

                {/* Reset All Teams Card */}
                <div className="rounded-3xl border-2 border-red-500/40 bg-card p-6 space-y-4 shadow-2xl">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                        <span>🔥</span>
                        <span>Reset All 10 Teams (Full Fresh Start)</span>
                      </h4>
                      <p className="text-xs text-white/60 mt-1 leading-relaxed">
                        This resets all 10 teams' steps, scores, timestamps, boat claims, and photo submissions back to Step 0.
                      </p>
                    </div>
                    <span className="rounded-full bg-red-500/20 text-red-300 border border-red-500/40 px-3 py-1 text-xs font-bold whitespace-nowrap">
                      Passcode Protected
                    </span>
                  </div>

                  <div className="rounded-2xl bg-inset p-4 space-y-2 border border-white/10">
                    <label className="text-xs font-semibold text-white/80 block">
                      Enter Reset Passcode:
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <input
                        type="password"
                        value={resetPasscodeInput}
                        onChange={(e) => setResetPasscodeInput(e.target.value)}
                        placeholder="Enter Confirmation Passcode"
                        className="flex-1 rounded-xl border border-red-500/40 bg-card px-4 py-2.5 text-xs text-white placeholder-white/30 focus:border-red-400 focus:outline-none"
                      />
                      <button
                        onClick={() => handleResetAll(resetPasscodeInput)}
                        className="rounded-xl bg-red-600 hover:bg-red-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition active:scale-95 flex items-center justify-center gap-2"
                      >
                        <span>Reset All 10 Teams</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-white/50 pt-1">
                      Reset Passcode: <code className="text-gold font-mono font-bold">THANIMA@CORE26</code> or <code className="text-gold font-mono font-bold">RESET@THANIMA26</code>
                    </p>
                  </div>
                </div>

                {/* Reset Individual Team Card */}
                <div className="rounded-3xl border border-white/10 bg-card p-6 space-y-4 shadow-xl">
                  <div>
                    <h4 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                      <span>↺</span>
                      <span>Reset Individual Team</span>
                    </h4>
                    <p className="text-xs text-white/60 mt-1">
                      Reset only a single team back to Step 0 without affecting other teams.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {teams.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-2xl border border-white/10 bg-inset p-3.5 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-bg text-[10px] font-black">
                              {t.team_number}
                            </span>
                            <span className="font-bold text-sm text-white">{t.name}</span>
                          </div>
                          <p className="text-[11px] text-white/50 mt-0.5">
                            Step {t.current_step || 0}/7 • {t.isFinished ? 'Completed' : (t.currentGame || 'Starting')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleResetSingleTeam(t.id, t.name)}
                          className="rounded-xl border border-red-500/30 bg-red-950/40 hover:bg-red-900/60 text-red-200 px-3 py-1.5 text-xs font-bold transition active:scale-95"
                        >
                          Reset
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Deny / Request Retry Modal Popup */}
      {denyingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-md rounded-3xl border border-red-500/40 bg-card p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h4 className="font-serif text-lg font-bold text-red-300">
                  Request Retry for Team {denyingTeam.team_number} ({denyingTeam.name})
                </h4>
                <p className="text-xs text-white/60">
                  Station: <strong className="text-gold">{activeStation || denyingTeam.currentGame}</strong>
                </p>
              </div>
              <button
                onClick={() => setDenyingTeam(null)}
                aria-label="Close"
                className="text-white/50 hover:text-white p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-white/70 block">Select Quick Reason or Type Below:</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  'Clue / colours not found yet',
                  'Puzzle incomplete or wrong',
                  'Wrong answer - please retry',
                  'Photo blurry / invalid relic',
                  'Follow coordinator instructions'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomDenyReason(preset)}
                    className="rounded-xl bg-inset border border-white/10 px-2.5 py-2 text-[11px] text-white/80 hover:bg-white/10 text-left"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-white/70 block mb-1">Custom Note to Team Screen:</label>
              <textarea
                value={customDenyReason}
                onChange={(e) => setCustomDenyReason(e.target.value)}
                placeholder="e.g. Please find both colour clues before presenting to coordinator..."
                rows={3}
                className="w-full rounded-2xl border border-white/20 bg-inset p-3 text-xs text-white placeholder-white/30 focus:border-red-400 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleDenyTeam}
                className="flex-1 rounded-2xl bg-crimson py-3 text-xs font-bold text-white hover:bg-red-700 transition shadow"
              >
                Send Notice to Team Screen
              </button>
              <button
                onClick={() => setDenyingTeam(null)}
                className="rounded-2xl bg-white/10 px-4 py-3 text-xs text-white/70 hover:bg-white/20"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Photo View */}
      {enlargedPhoto && (
        <div
          onClick={() => setEnlargedPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
        >
          <div className="relative max-w-lg">
            <img src={enlargedPhoto} alt="Enlarged Relic" className="rounded-3xl max-h-[85vh] shadow-2xl" />
            <button
              onClick={() => setEnlargedPhoto(null)}
              aria-label="Close"
              className="absolute -top-3 -right-3 h-9 w-9 rounded-full bg-card border border-gold text-gold flex items-center justify-center shadow-lg hover:bg-gold hover:text-bg transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Station Access Code Gate Modal */}
      {stationToUnlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-gold/40 bg-card p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-gold tracking-wider block">
                  Station Verification Required
                </span>
                <h3 className="font-serif text-xl font-bold text-white mt-0.5">
                  {stationToUnlock.name}
                </h3>
                <p className="text-xs text-white/60 mt-1">
                  Enter the private station access code to access and coordinate this game desk.
                </p>
              </div>
              <button
                onClick={() => {
                  setStationToUnlock(null);
                  setStationUnlockError('');
                  setStationAccessCodeInput('');
                }}
                className="text-white/40 hover:text-white p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVerifyStationAccessCode} className="space-y-4 pt-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1.5">
                  Station Access Code
                </label>
                <input
                  type="password"
                  autoFocus
                  value={stationAccessCodeInput}
                  onChange={(e) => {
                    setStationAccessCodeInput(e.target.value);
                    setStationUnlockError('');
                  }}
                  placeholder="Enter station access code"
                  className="w-full rounded-2xl border border-gold/40 bg-inset px-4 py-3 text-sm text-white placeholder-white/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold font-mono tracking-widest text-center uppercase"
                />
              </div>

              {stationUnlockError && (
                <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300 font-medium">
                  {stationUnlockError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStationToUnlock(null);
                    setStationUnlockError('');
                    setStationAccessCodeInput('');
                  }}
                  className="w-1/2 rounded-xl border border-white/20 bg-inset py-2.5 text-xs font-semibold text-white/70 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUnlocking}
                  className="w-1/2 rounded-xl bg-gold py-2.5 text-xs font-bold text-bg hover:bg-gold/90 transition shadow-md disabled:opacity-50"
                >
                  {isUnlocking ? 'Verifying...' : 'Unlock & Enter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
