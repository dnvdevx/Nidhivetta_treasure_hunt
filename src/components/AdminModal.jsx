import React, { useState, useEffect } from 'react';

const STATIONS = [
  { id: 'Hot n Cold', name: 'Hot n Cold' },
  { id: 'Jigsaw', name: 'Jigsaw' },
  { id: 'Photo Game', name: 'Photo Game' },
  { id: 'Movie Game', name: 'Movie Game' },
  { id: 'Boat Game', name: 'Boat Game' },
  { id: 'Final Game', name: 'Final Game' },
  { id: 'Starting Station', name: 'Starting Stations' }
];

const PHOTO_TARGETS = [
  { index: 0, title: 'Sacred Nilavilakku (Brass Lamp)', desc: 'Multi-tiered traditional Kerala brass lamp' },
  { index: 1, title: 'Kathakali Art or Emblem', desc: 'Miniature mask, emblem, or painting of Kathakali' },
  { index: 2, title: 'Kasavu Fabric / Golden Weave', desc: 'Off-white cotton fabric with golden kasavu border' },
  { index: 3, title: 'Coir Craft or Coconut Heritage Relic', desc: 'Handmade coir artifact or coconut shell relic' },
  { index: 4, title: 'Vallam Motif / Traditional Snake Boat Carving', desc: 'Carving or painting of Kerala snake boat' }
];

const normalizeGameName = (name) => {
  if (!name) return '';
  const n = String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (n.includes('hot') && n.includes('cold')) return 'hotncold';
  if (n.includes('jigsaw') || n.includes('number')) return 'jigsaw';
  if (n.includes('photo')) return 'photogame';
  if (n.includes('movie')) return 'moviegame';
  if (n.includes('boat')) return 'boatgame';
  if (n.includes('final') || n.includes('crown') || n.includes('makutam')) return 'finalgame';
  if (n.includes('start') || n.includes('qr') || n.includes('entry')) return 'startingstation';
  return n;
};

const matchesStation = (currentGame, stationId) => {
  return normalizeGameName(currentGame) === normalizeGameName(stationId);
};

export default function AdminModal({ isOpen, onClose }) {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('thanima_admin_key') || '');
  const [authenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState('teams_matrix'); // 'teams_matrix', 'volunteer_station', 'boat_game', 'teams', 'start_qrs', 'game_qrs', 'reset'
  const [selectedStation, setSelectedStation] = useState('Hot n Cold');
  const [denyingTeam, setDenyingTeam] = useState(null);
  const [customDenyReason, setCustomDenyReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [teams, setTeams] = useState([]);
  const [photoSubmissions, setPhotoSubmissions] = useState([]);
  const [startQrs, setStartQrs] = useState([]);
  const [gameQrs, setGameQrs] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [filterPhotoStatus, setFilterPhotoStatus] = useState('all'); // 'all', 'pending', 'approved'
  const [enlargedPhoto, setEnlargedPhoto] = useState(null);
  const [boatQuestions, setBoatQuestions] = useState([]);
  const [editingBoatQ, setEditingBoatQ] = useState(null);
  const [editingStation, setEditingStation] = useState(null);

  const fetchDashboardData = async (key) => {
    const k = key || adminKey;
    if (!k || !k.trim()) return;
    const teamRes = await fetch(`/api/admin/teams?key=${encodeURIComponent(k.trim())}`);
    const teamData = await teamRes.json();
    if (!teamRes.ok) throw new Error(teamData.error || 'Invalid Organizer Key');

    const photoRes = await fetch(`/api/admin/photo-submissions?key=${encodeURIComponent(k.trim())}`);
    const photoData = await photoRes.json();

    const qrRes = await fetch(`/api/admin/qr-codes?key=${encodeURIComponent(k.trim())}`);
    const qrData = await qrRes.json();

    const boatRes = await fetch(`/api/admin/boat-questions?key=${encodeURIComponent(k.trim())}`);
    const boatData = await boatRes.json();

    setTeams(teamData.teams || []);
    setPhotoSubmissions(photoData || []);
    setStartQrs(qrData.startQrs || []);
    setGameQrs(qrData.gameQrs || []);
    setBoatQuestions(boatData || []);
  };

  const handleAdminAuth = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await fetchDashboardData(adminKey);
      setAuthenticated(true);
      localStorage.setItem('thanima_admin_key', adminKey.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Attempt auto-auth on mount if key was saved
  useEffect(() => {
    const saved = localStorage.getItem('thanima_admin_key');
    if (saved && !authenticated) {
      fetchDashboardData(saved)
        .then(() => setAuthenticated(true))
        .catch(() => {});
    }
  }, []);

  // Continuous live auto-refresh every 3.5s when authenticated
  useEffect(() => {
    if (authenticated) {
      const interval = setInterval(() => {
        fetchDashboardData(adminKey).catch(() => {});
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [authenticated, adminKey]);

  if (!isOpen) return null;

  const handleUpdateStation = async (stationId, { allowedTeamNumbers, locationHint, qrCode }) => {
    try {
      setActionMessage('');
      const res = await fetch('/api/admin/stations/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: adminKey.trim(),
          stationId,
          allowedTeamNumbers,
          locationHint,
          qrCode
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update station');
      setActionMessage(`Saved Starting Station ${stationId}! Assigned teams: ${allowedTeamNumbers.join(' & ')}`);
      setTimeout(() => setActionMessage(''), 4500);
      setEditingStation(null);
      await fetchDashboardData(adminKey);
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleReviewPhoto = async (submissionId, status) => {
    try {
      setActionMessage('');
      const res = await fetch('/api/admin/photo-submissions/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: adminKey.trim(),
          submissionId,
          status
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to review photo');

      setActionMessage(
        data.taskCompleted
          ? `Approved! Team now has 3 valid photos. Task completed automatically!`
          : `Photo marked as ${status}.`
      );
      setTimeout(() => setActionMessage(''), 4500);
      await fetchDashboardData(adminKey);
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleMarshalDirectApprove = async (teamId, gameName) => {
    if (!window.confirm(`Approve task for this team? This will advance them to their next trial.`)) return;
    try {
      setActionMessage('');
      const res = await fetch('/api/admin/marshal/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: adminKey.trim(),
          teamId,
          marshalName: `${gameName || 'Station'} Volunteer`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');

      setActionMessage(`Team approved! Next trial & letter unlocked.`);
      setTimeout(() => setActionMessage(''), 4500);
      await fetchDashboardData(adminKey);
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleMarshalDeny = async (teamId, reason, gameName) => {
    try {
      setActionMessage('');
      const res = await fetch('/api/admin/marshal/deny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: adminKey.trim(),
          teamId,
          marshalName: `${gameName || 'Station'} Volunteer`,
          reason: reason || 'Task incomplete or needs correction. Please review the rules and retry!'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Denial failed');

      setActionMessage(`Team marked for Retry. Notice sent to team device.`);
      setDenyingTeam(null);
      setCustomDenyReason('');
      setTimeout(() => setActionMessage(''), 4500);
      await fetchDashboardData(adminKey);
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleUpdateRoster = async (team) => {
    try {
      setActionMessage('');
      const res = await fetch('/api/admin/teams/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: adminKey.trim(),
          teamId: team.id,
          name: team.name,
          passcode: team.passcode,
          members: team.members
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setActionMessage(`Saved details for ${team.name}!`);
      setTimeout(() => setActionMessage(''), 4000);
      await fetchDashboardData(adminKey);
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleResetTeam = async (teamId) => {
    if (!window.confirm(`Reset this team's progress to 0?`)) return;
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey: adminKey.trim(), teamId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setActionMessage(`Team reset!`);
      await fetchDashboardData(adminKey);
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleResetAll = async () => {
    if (!window.confirm('Reset ALL 10 teams and all photo submissions to 0?')) return;
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey: adminKey.trim(), all: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setActionMessage('All 10 teams reset to step 0!');
      await fetchDashboardData(adminKey);
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleUpdateBoatQuestion = async (teamNumber, { question, answer, questionCode, answerCode, code }) => {
    try {
      setActionMessage('');
      const res = await fetch('/api/admin/boat-questions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: adminKey.trim(),
          teamNumber,
          question,
          answer,
          questionCode,
          answerCode: answerCode || code,
          code: answerCode || code
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update boat question');
      setActionMessage(`Saved boat challenge & codes for Team ${teamNumber}!`);
      setTimeout(() => setActionMessage(''), 4000);
      setEditingBoatQ(null);
      await fetchDashboardData(adminKey);
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleClearBoatClaim = async (boatNumberOrTeamId) => {
    try {
      setActionMessage('');
      const res = await fetch('/api/admin/boat-questions/clear-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: adminKey.trim(),
          questionBoatNumber: typeof boatNumberOrTeamId === 'number' ? boatNumberOrTeamId : undefined,
          teamId: typeof boatNumberOrTeamId === 'string' ? boatNumberOrTeamId : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear boat claim');
      setActionMessage('Boat claim released! This question boat is now available for any team.');
      setTimeout(() => setActionMessage(''), 4000);
      await fetchDashboardData(adminKey);
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const filteredPhotos = photoSubmissions.filter((p) => {
    if (filterPhotoStatus === 'pending') return p.status === 'pending';
    if (filterPhotoStatus === 'approved') return p.status === 'approved';
    return true;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 px-4">
      <div className="w-full max-w-4xl rounded-3xl border border-gold/40 bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gold/20 pb-3">
          <div>
            <h3 className="font-serif text-2xl font-bold text-gold">Organizers & Marshals Desk</h3>
            <p className="text-[11px] text-white/50 tracking-wider uppercase">Live Approvals • Photo Review • Roster Feed</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-white/60 hover:text-white p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!authenticated ? (
          <form onSubmit={handleAdminAuth} className="mt-6 space-y-4 max-w-md mx-auto">
            <p className="text-xs text-white/70">
              Enter Organizer Passcode to access live approvals, review photo game submissions, and feed team rosters.
              (Dev passcode: <code className="text-gold">thanima-admin-2026</code>)
            </p>
            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/60 p-2.5 text-xs text-red-200">
                {error}
              </div>
            )}
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Organizer Passcode"
              className="w-full rounded-xl border border-white/20 bg-inset px-4 py-3 text-sm text-white placeholder-white/30 focus:border-gold focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gold py-3 text-xs font-bold text-bg hover:bg-gold/90 disabled:opacity-50 shadow-lg"
            >
              {loading ? 'Authenticating...' : 'Access Organizers Desk'}
            </button>
          </form>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Nav tabs */}
            <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3 text-xs font-bold">
              <button
                onClick={() => setTab('teams_matrix')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  tab === 'teams_matrix' ? 'bg-gold text-bg' : 'bg-inset text-white/70 hover:text-white'
                }`}
              >
                10 Teams Tracker (Live)
              </button>
              <button
                onClick={() => setTab('volunteer_station')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  tab === 'volunteer_station' ? 'bg-gold text-bg' : 'bg-inset text-white/70 hover:text-white'
                }`}
              >
                Station Volunteer View
                <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded font-mono">
                  {selectedStation}
                </span>
              </button>
              <button
                onClick={() => setTab('boat_game')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  tab === 'boat_game' ? 'bg-gold text-bg' : 'bg-inset text-white/70 hover:text-white'
                }`}
              >
                Boat Fleet (10 Q&A)
              </button>
              <button
                onClick={() => setTab('teams')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  tab === 'teams' ? 'bg-gold text-bg' : 'bg-inset text-white/70 hover:text-white'
                }`}
              >
                Rosters & Passcodes
              </button>
              <button
                onClick={() => setTab('start_qrs')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  tab === 'start_qrs' ? 'bg-gold text-bg' : 'bg-inset text-white/70 hover:text-white'
                }`}
              >
                5 Starting QRs
              </button>
              <button
                onClick={() => setTab('game_qrs')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  tab === 'game_qrs' ? 'bg-gold text-bg' : 'bg-inset text-white/70 hover:text-white'
                }`}
              >
                6 Station QRs
              </button>
              <button
                onClick={() => setTab('reset')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  tab === 'reset' ? 'bg-crimson text-white' : 'bg-inset text-white/70 hover:text-white'
                }`}
              >
                Reset
              </button>
            </div>

            {actionMessage && (
              <div className="rounded-xl border border-gold/40 bg-gold/15 p-2.5 text-xs text-gold font-semibold">
                {actionMessage}
              </div>
            )}

            {/* TAB 1: Live Teams Tracker Matrix & Standings */}
            {tab === 'teams_matrix' && (
              <div className="space-y-4">
                {/* Station Ticker: Click a game to volunteer directly at that station */}
                <div className="rounded-2xl border border-white/10 bg-inset/70 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white/80">Click Any Game to Act as that Station's Volunteer:</span>
                    <span className="text-[11px] text-white/50">Live updates active</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {STATIONS.map((st) => {
                      const count = teams.filter((t) => matchesStation(t.currentGame, st.id)).length;
                      return (
                        <button
                          key={st.id}
                          onClick={() => {
                            setSelectedStation(st.name);
                            setTab('volunteer_station');
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-gold/30 bg-card px-2.5 py-1.5 text-xs font-semibold text-white hover:border-gold hover:bg-gold/20 transition active:scale-95 shadow-sm"
                        >
                          <span>{st.icon}</span>
                          <span>{st.name}</span>
                          <span
                            className={`flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full text-[10px] font-bold ${
                              count > 0 ? 'bg-gold text-bg' : 'bg-white/10 text-white/40'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* All 10 Teams Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {teams.map((t) => {
                    const isFinished = t.isFinished || t.current_step >= 7;
                    const membersList = (t.members || []).map((m) => m.name).filter(Boolean);

                    return (
                      <div
                        key={t.id}
                        className={`rounded-2xl border p-4 space-y-3 bg-inset/90 shadow-md transition ${
                          isFinished
                            ? 'border-emerald-500/50 bg-emerald-950/20'
                            : 'border-white/10 hover:border-gold/40'
                        }`}
                      >
                        {/* Team Title & Score */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold/20 text-gold text-xs font-black">
                                {t.team_number}
                              </span>
                              <h4 className="font-serif text-base font-bold text-gold">
                                {t.name}
                              </h4>
                            </div>
                            <p className="text-[11px] text-white/50 mt-0.5">
                              Secret Passcode: <code className="font-mono text-gold font-bold">{t.passcode}</code>
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-sm font-black text-white block">
                              {t.points || 0} pts
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-white/50">
                              {isFinished ? 'Completed' : `Step ${t.current_step || 0} of 7`}
                            </span>
                          </div>
                        </div>

                        {/* Current Game Pill - Clearly indicates which game team is playing right now */}
                        <div className="rounded-xl border border-gold/30 bg-card/80 p-2.5 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-white/50 uppercase tracking-wider block font-bold">
                              Currently Playing
                            </span>
                            <span className="font-bold text-sm text-gold flex items-center gap-1.5 mt-0.5">
                              {t.currentGame || 'Starting Station'}
                            </span>
                          </div>
                          {!isFinished && (
                            <button
                              onClick={() => {
                                setSelectedStation(t.currentGame || 'Hot n Cold');
                                setTab('volunteer_station');
                              }}
                              className="rounded-lg bg-gold/20 hover:bg-gold/30 border border-gold/40 px-2.5 py-1 text-[11px] font-bold text-gold transition active:scale-95"
                            >
                              Volunteer Here ➔
                            </button>
                          )}
                        </div>

                        {/* Roster preview */}
                        <div className="text-[11px] text-white/60 space-y-0.5">
                          <span className="text-[10px] uppercase text-white/40 font-bold block">Players (4):</span>
                          <p className="text-white/80 line-clamp-2">
                            {membersList.length > 0 ? membersList.join(', ') : 'Roster pending'}
                          </p>
                        </div>

                        {/* Denial notice if active */}
                        {t.marshal_feedback && (
                          <div className="rounded-lg border border-red-500/40 bg-red-950/50 p-2 text-[11px] text-red-200">
                            <span className="font-bold text-red-300">Retry Notice: </span>
                            "{t.marshal_feedback.reason}"
                          </div>
                        )}

                        {/* Quick Action Controls */}
                        {!isFinished && (
                          <div className="pt-1 flex items-center gap-2">
                            <button
                              onClick={() => handleMarshalDirectApprove(t.id, t.currentGame)}
                              className="flex-1 rounded-xl bg-gold/20 hover:bg-gold/30 border border-gold/50 py-2 text-xs font-bold text-gold active:scale-95 transition flex items-center justify-center gap-1.5 shadow"
                            >
                              Pass Station Task
                            </button>
                            <button
                              onClick={() => setDenyingTeam(t)}
                              className="rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-500/40 px-3 py-2 text-xs font-bold text-red-300 active:scale-95 transition"
                            >
                              Request Retry
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: Dedicated Station Volunteer View */}
            {tab === 'volunteer_station' && (
              <div className="space-y-4">
                {/* Station Switcher Bar */}
                <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
                  <span className="text-xs font-bold text-white/60 mr-1">Select Station:</span>
                  {STATIONS.map((st) => {
                    const isSelected = normalizeGameName(selectedStation) === normalizeGameName(st.id);
                    const count = teams.filter((t) => matchesStation(t.currentGame, st.id)).length;

                    return (
                      <button
                        key={st.id}
                        onClick={() => setSelectedStation(st.name)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-sm ${
                          isSelected
                            ? 'bg-gold text-bg shadow-gold/20'
                            : 'bg-inset text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                        }`}
                      >
                        <span>{st.icon}</span>
                        <span>{st.name}</span>
                        <span
                          className={`flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full text-[10px] font-black ${
                            isSelected
                              ? 'bg-bg text-gold'
                              : count > 0
                              ? 'bg-gold text-bg'
                              : 'bg-white/10 text-white/50'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Station Volunteer Header */}
                <div className="rounded-2xl border border-gold/30 bg-inset p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif text-lg font-bold text-gold">
                        Station Volunteer: {selectedStation}
                      </h4>
                    </div>
                    <p className="text-xs text-white/60 mt-0.5">
                      You are acting as the official volunteer for this game. Below are the teams currently stationed here.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-white/50 block">Teams Currently Here</span>
                    <span className="font-mono text-xl font-black text-gold">
                      {teams.filter((t) => matchesStation(t.currentGame, selectedStation)).length} / 10
                    </span>
                  </div>
                </div>

                {/* Filtered Teams at this Station */}
                {(() => {
                  const stationTeams = teams.filter((t) => matchesStation(t.currentGame, selectedStation));

                  if (stationTeams.length === 0) {
                    return (
                      <div className="text-center py-10 rounded-2xl border border-dashed border-white/15 bg-inset/50 space-y-3">
                        <span className="text-3xl block">⏳</span>
                        <h5 className="font-bold text-sm text-white/80">
                          No teams are currently at the {selectedStation} station
                        </h5>
                        <p className="text-xs text-white/50 max-w-md mx-auto">
                          Teams will arrive and appear here automatically as they conquer prior trials on their route.
                        </p>
                        <div className="pt-2 text-[11px] text-white/40">
                          Looking for a team? Switch to{' '}
                          <button
                            onClick={() => setTab('teams_matrix')}
                            className="text-gold underline font-bold"
                          >
                            10 Teams Tracker
                          </button>{' '}
                          to see all team positions.
                        </div>
                      </div>
                    );
                  }

                  // SPECIAL VIEW: PHOTO GAME STATION
                  if (normalizeGameName(selectedStation) === 'photogame') {
                    return (
                      <div className="space-y-4">
                        {stationTeams.map((t) => {
                          const teamPhotos = photoSubmissions.filter((p) => p.team_id === t.id);
                          const approvedCount = teamPhotos.filter((p) => p.status === 'approved').length;

                          return (
                            <div
                              key={t.id}
                              className="rounded-2xl border border-gold/40 bg-inset/95 p-5 space-y-4 shadow-xl"
                            >
                              <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-3 gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-bg text-xs font-black">
                                      {t.team_number}
                                    </span>
                                    <h4 className="font-serif text-lg font-bold text-gold">{t.name}</h4>
                                    <span className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-full">
                                      Passcode: <code className="font-mono text-gold font-bold">{t.passcode}</code>
                                    </span>
                                  </div>
                                  <p className="text-xs text-white/50 mt-1">
                                    Players: {(t.members || []).map((m) => m.name).join(', ') || 'Roster pending'}
                                  </p>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <span className="text-[10px] uppercase text-white/50 block font-bold">
                                      Approved Photos
                                    </span>
                                    <span className="text-base font-black text-gold">
                                      {approvedCount} / 3
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleMarshalDirectApprove(t.id, 'Photo Game')}
                                    className="rounded-xl bg-gold hover:bg-gold/90 text-bg px-4 py-2 text-xs font-bold active:scale-95 transition shadow-lg flex items-center gap-1.5"
                                  >
                                    Overall Game Approval
                                  </button>
                                </div>
                              </div>

                              {/* Photo Relics Grid for this team */}
                              <div className="space-y-3">
                                <h5 className="text-xs font-bold uppercase tracking-wider text-white/70">
                                  Captured Relics Submissions:
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {PHOTO_TARGETS.map((tgt) => {
                                    const sub = teamPhotos.find((p) => p.target_index === tgt.index);
                                    const isApproved = sub?.status === 'approved';
                                    const isPending = sub?.status === 'pending';
                                    const isRejected = sub?.status === 'rejected';

                                    return (
                                      <div
                                        key={tgt.index}
                                        className={`rounded-xl border p-3 flex gap-3 transition ${
                                          isApproved
                                            ? 'border-emerald-500/50 bg-emerald-950/20'
                                            : isPending
                                            ? 'border-amber-500/50 bg-amber-950/20 shadow-md'
                                            : isRejected
                                            ? 'border-red-500/40 bg-red-950/20'
                                            : 'border-white/10 bg-card/60 opacity-60'
                                        }`}
                                      >
                                        {sub?.image_url ? (
                                          <img
                                            src={sub.image_url}
                                            alt={tgt.title}
                                            onClick={() => setEnlargedPhoto(sub.image_url)}
                                            className="h-20 w-20 rounded-lg object-cover border border-white/20 cursor-pointer shadow hover:opacity-80 flex-shrink-0"
                                          />
                                        ) : (
                                          <div className="h-20 w-20 rounded-lg border border-dashed border-white/20 bg-inset flex flex-col items-center justify-center text-[10px] text-white/30 text-center p-1 flex-shrink-0">
                                            <span>Not uploaded</span>
                                          </div>
                                        )}

                                        <div className="flex-1 flex flex-col justify-between">
                                          <div>
                                            <div className="flex items-center justify-between">
                                              <span className="text-[10px] font-bold uppercase text-gold">
                                                Target #{tgt.index + 1}
                                              </span>
                                              {isApproved && (
                                                <span className="text-[10px] text-emerald-400 font-bold">
                                                  Approved
                                                </span>
                                              )}
                                              {isPending && (
                                                <span className="text-[10px] text-amber-300 font-bold animate-pulse">
                                                  Under Review
                                                </span>
                                              )}
                                              {isRejected && (
                                                <span className="text-[10px] text-red-400 font-bold">
                                                  Rejected
                                                </span>
                                              )}
                                            </div>
                                            <h6 className="font-semibold text-xs text-white mt-0.5">
                                              {tgt.title}
                                            </h6>
                                            {sub?.participant_name && (
                                              <p className="text-[10px] text-white/50 mt-0.5">
                                                By {sub.participant_name}
                                              </p>
                                            )}
                                          </div>

                                          {sub && (
                                            <div className="mt-2 flex gap-1.5">
                                              <button
                                                onClick={() => handleReviewPhoto(sub.id, 'approved')}
                                                className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-1 text-[11px] font-bold text-white shadow transition"
                                              >
                                                Approve
                                              </button>
                                              <button
                                                onClick={() => handleReviewPhoto(sub.id, 'rejected')}
                                                className="flex-1 rounded-lg bg-red-800 hover:bg-red-700 py-1 text-[11px] font-bold text-white shadow transition"
                                              >
                                                Reject
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  // STANDARD GAME STATIONS (Hot n Cold, Jigsaw, Movie Game, Boat Game, Final Game, Starting Station)
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {stationTeams.map((t) => (
                        <div
                          key={t.id}
                          className="rounded-2xl border border-gold/40 bg-inset/95 p-4 space-y-3.5 shadow-lg"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-bg text-xs font-black">
                                  {t.team_number}
                                </span>
                                <h4 className="font-serif text-lg font-bold text-gold">{t.name}</h4>
                              </div>
                              <p className="text-xs text-white/50 mt-0.5">
                                Passcode: <code className="font-mono text-gold font-bold">{t.passcode}</code>
                              </p>
                            </div>
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-full font-bold">
                              Present at Station
                            </span>
                          </div>

                          <div className="text-xs text-white/70 space-y-0.5">
                            <span className="text-[10px] uppercase text-white/40 font-bold block">
                              Team Members:
                            </span>
                            <p className="text-white/90">
                              {(t.members || []).map((m) => m.name).join(', ') || 'Roster pending'}
                            </p>
                          </div>

                          {t.marshal_feedback && (
                            <div className="rounded-xl border border-red-500/40 bg-red-950/60 p-2.5 text-xs text-red-200">
                              <span className="font-bold text-red-300">Active Retry Notice: </span>
                              "{t.marshal_feedback.reason}"
                            </div>
                          )}

                          <div className="pt-2 flex items-center gap-2 border-t border-white/10">
                            <button
                              onClick={() => handleMarshalDirectApprove(t.id, selectedStation)}
                              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-lg active:scale-95 transition flex items-center justify-center gap-1.5"
                            >
                              Approve & Unlock Next
                            </button>
                            <button
                              onClick={() => setDenyingTeam(t)}
                              className="rounded-xl bg-red-900/60 hover:bg-red-800 border border-red-500/40 px-3.5 py-2.5 text-xs font-bold text-red-200 active:scale-95 transition"
                            >
                              Deny / Retry
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB 2: Boat Game (10 Questions & Codes) */}
            {tab === 'boat_game' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h4 className="font-serif text-base font-bold text-gold">
                      20 Fleet Boats: 10 Question Boats + 10 Answer Boats
                    </h4>
                    <p className="text-xs text-white/60 mt-0.5">
                      Open to ANY Team (First Come, First Served). A team finds any unoccupied <strong>Question Boat</strong> (entering code locks it to them & reveals question), then solves it and enters the <strong>Answer Boat</strong> code.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href="/qrs/print-boat-tags.html"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-gold/20 border border-gold/40 px-3 py-1.5 text-xs font-bold text-gold hover:bg-gold/30 transition flex items-center gap-1.5"
                    >
                      Print 20 Boat Tags
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {boatQuestions.map((bq) => {
                    const isEditing = editingBoatQ?.teamNumber === bq.teamNumber;
                    const qBoatNum = bq.questionBoatNumber || bq.teamNumber;
                    const aBoatNum = bq.answerBoatNumber || bq.teamNumber + 10;
                    const qCode = bq.questionCode || 'W4N8X2';
                    const aCode = bq.answerCode || bq.code || 'A3B2C1';
                    const claimingTeam =
                      teams.find((t) => t.claimed_boat_question === qBoatNum) ||
                      (bq.claimedByTeamId ? { name: bq.claimedByTeamName, id: bq.claimedByTeamId } : null);

                    return (
                      <div
                        key={bq.teamNumber}
                        className="rounded-2xl border border-gold/30 bg-inset/95 p-4 space-y-3 relative shadow-lg"
                      >
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-bg text-[10px] font-black">
                              {qBoatNum}
                            </span>
                            <span className="text-xs font-bold text-gold">
                              Question Boat #{qBoatNum}
                            </span>
                            {claimingTeam ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                Claimed: {claimingTeam.name}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                Available
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {claimingTeam && (
                              <button
                                onClick={() => handleClearBoatClaim(qBoatNum)}
                                className="text-[10px] bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-500/40 rounded px-1.5 py-0.5 font-semibold transition"
                                title="Release claim so another team can take this boat"
                              >
                                Release
                              </button>
                            )}
                            {!isEditing ? (
                              <button
                                onClick={() =>
                                  setEditingBoatQ({
                                    ...bq,
                                    questionCode: qCode,
                                    answerCode: aCode
                                  })
                                }
                                className="text-[11px] text-white/50 hover:text-gold underline"
                              >
                                Edit Codes
                              </button>
                            ) : (
                              <span className="text-[10px] text-gold font-bold uppercase">Editing...</span>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="space-y-3 pt-1">
                            <div>
                              <label className="text-[10px] text-white/60 uppercase block">
                                Challenge Question
                              </label>
                              <textarea
                                value={editingBoatQ.question}
                                onChange={(e) => setEditingBoatQ({ ...editingBoatQ, question: e.target.value })}
                                className="w-full rounded-lg border border-white/20 bg-card p-2 text-xs text-white"
                                rows={2}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-gold uppercase font-bold block">
                                  Boat #{qBoatNum} Question Code
                                </label>
                                <input
                                  type="text"
                                  maxLength={6}
                                  value={editingBoatQ.questionCode}
                                  onChange={(e) =>
                                    setEditingBoatQ({ ...editingBoatQ, questionCode: e.target.value.toUpperCase() })
                                  }
                                  className="w-full rounded-lg border border-gold/40 bg-card px-2.5 py-1.5 text-xs text-gold font-mono font-bold uppercase tracking-widest"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-emerald-400 uppercase font-bold block">
                                  Boat #{aBoatNum} Answer Code
                                </label>
                                <input
                                  type="text"
                                  maxLength={6}
                                  value={editingBoatQ.answerCode}
                                  onChange={(e) =>
                                    setEditingBoatQ({ ...editingBoatQ, answerCode: e.target.value.toUpperCase() })
                                  }
                                  className="w-full rounded-lg border border-emerald-500/40 bg-card px-2.5 py-1.5 text-xs text-emerald-300 font-mono font-bold uppercase tracking-widest"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] text-white/60 uppercase block">
                                Answer (Labeled on Boat #{aBoatNum})
                              </label>
                              <input
                                type="text"
                                value={editingBoatQ.answer}
                                onChange={(e) => setEditingBoatQ({ ...editingBoatQ, answer: e.target.value })}
                                className="w-full rounded-lg border border-white/20 bg-card px-2.5 py-1.5 text-xs text-white font-semibold"
                              />
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleUpdateBoatQuestion(editingBoatQ.teamNumber, editingBoatQ)}
                                className="flex-1 rounded-lg bg-gold py-1.5 text-xs font-bold text-bg hover:bg-gold/90 transition"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => setEditingBoatQ(null)}
                                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2.5 text-xs">
                            {/* Question Boat Card */}
                            <div className="rounded-xl border border-gold/20 bg-card/60 p-2.5 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gold flex items-center gap-1">
                                  Boat #{qBoatNum} (Question Boat)
                                </span>
                                <span className="font-mono text-xs font-black bg-gold/20 border border-gold/40 text-gold px-2 py-0.5 rounded tracking-widest">
                                  {qCode}
                                </span>
                              </div>
                              <p className="text-[11px] text-white/80 italic font-serif leading-snug">
                                "{bq.question}"
                              </p>
                            </div>

                            {/* Answer Boat Card */}
                            <div className="rounded-xl border border-emerald-500/20 bg-card/60 p-2.5 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                                  Boat #{aBoatNum} (Answer Boat)
                                </span>
                                <span className="font-mono text-xs font-black bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded tracking-widest">
                                  {aCode}
                                </span>
                              </div>
                              <p className="text-xs text-white font-bold">
                                Inscribed: <span className="text-emerald-300">{bq.answer}</span>
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}



            {/* TAB 3: 10 Teams & 4 Players Feed */}
            {tab === 'teams' && (
              <div className="space-y-4">
                <p className="text-xs text-white/70">
                  Select a team to feed or modify player names, student register numbers, and team passcodes:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {teams.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTeam(JSON.parse(JSON.stringify(t)))}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        selectedTeam?.id === t.id
                          ? 'border-gold bg-gold/20 text-gold'
                          : 'border-white/10 bg-inset text-white hover:border-white/30'
                      }`}
                    >
                      <div className="font-bold text-xs">{t.name}</div>
                      <div className="text-[10px] text-white/50 mt-0.5">
                        Step {t.current_step}/7
                      </div>
                    </button>
                  ))}
                </div>

                {selectedTeam && (
                  <div className="rounded-2xl border border-gold/30 bg-inset p-4 space-y-4 mt-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <h4 className="font-serif text-lg font-bold text-gold">
                        Editing {selectedTeam.name}
                      </h4>
                      <span className="text-[11px] text-white/50">
                        Starting Station: {selectedTeam.start_station_id}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-white/60 block">Team Name</label>
                        <input
                          type="text"
                          value={selectedTeam.name}
                          onChange={(e) => setSelectedTeam({ ...selectedTeam, name: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-white/20 bg-card px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-white/60 block">Team Passcode</label>
                        <input
                          type="text"
                          value={selectedTeam.passcode}
                          onChange={(e) => setSelectedTeam({ ...selectedTeam, passcode: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-white/20 bg-card px-3 py-2 text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs uppercase tracking-wider text-gold font-bold mb-2">
                        4 Pre-Registered Players (Name & Student Reg No)
                      </h5>
                      <div className="space-y-2">
                        {(selectedTeam.members || []).map((m, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <span className="text-[10px] w-14 text-white/50">Player {idx + 1}:</span>
                            <input
                              type="text"
                              value={m.name}
                              onChange={(e) => {
                                const copy = [...selectedTeam.members];
                                copy[idx].name = e.target.value;
                                setSelectedTeam({ ...selectedTeam, members: copy });
                              }}
                              placeholder="Full Name"
                              className="flex-1 rounded-lg border border-white/20 bg-card px-3 py-2 text-xs text-white"
                            />
                            <input
                              type="text"
                              value={m.reg_no}
                              onChange={(e) => {
                                const copy = [...selectedTeam.members];
                                copy[idx].reg_no = e.target.value.toUpperCase();
                                setSelectedTeam({ ...selectedTeam, members: copy });
                              }}
                              placeholder="Reg No"
                              className="w-32 rounded-lg border border-white/20 bg-card px-3 py-2 text-xs text-white uppercase font-mono"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleUpdateRoster(selectedTeam)}
                        className="flex-1 rounded-xl bg-gold py-2.5 text-xs font-bold text-bg hover:bg-gold/90 transition"
                      >
                        Save Team Changes
                      </button>
                      <button
                        onClick={() => handleResetTeam(selectedTeam.id)}
                        className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-2.5 text-xs font-bold text-red-200"
                      >
                        Reset Progress
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: 5 Starting QRs (Dynamically Editable) */}
            {tab === 'start_qrs' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h4 className="font-serif text-base font-bold text-gold">
                      5 Starting QR Codes (Configurable Team Assignment)
                    </h4>
                    <p className="text-xs text-white/60 mt-0.5">
                      Each QR code features <span className="text-gold font-bold">qr_image.png</span> in the center. You can reassign any station to different teams anytime!
                    </p>
                  </div>
                  <button onClick={() => window.print()} className="rounded-lg bg-gold/20 border border-gold/40 px-3 py-1.5 text-xs font-bold text-gold hover:bg-gold/30 transition flex items-center gap-1.5">
                    Print Station Cards
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {startQrs.map((st, idx) => {
                    const isEditing = editingStation?.stationId === st.stationId;

                    return (
                      <div
                        key={st.stationId}
                        className="rounded-2xl border border-white/15 bg-inset/95 p-4 flex flex-col items-center text-center space-y-2.5 relative shadow-lg"
                      >
                        <div className="w-full flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-gold">
                            Starting Station {idx + 1}
                          </span>
                          {!isEditing ? (
                            <button
                              onClick={() =>
                                setEditingStation({
                                  stationId: st.stationId,
                                  allowedTeamsInput: (st.allowedTeams || []).join(', '),
                                  locationHint: st.locationHint || '',
                                  qrCode: st.qrCode || ''
                                })
                              }
                              className="text-[11px] text-white/50 hover:text-gold underline"
                            >
                              Edit Station
                            </button>
                          ) : (
                            <span className="text-[10px] text-gold font-bold uppercase">Editing...</span>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="w-full space-y-2.5 pt-2 border-t border-white/10 text-left">
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-white/60 block">
                                Allowed Teams (e.g. 1, 2 or 3, 7)
                              </label>
                              <input
                                type="text"
                                value={editingStation.allowedTeamsInput}
                                onChange={(e) =>
                                  setEditingStation({
                                    ...editingStation,
                                    allowedTeamsInput: e.target.value
                                  })
                                }
                                placeholder="1, 2"
                                className="w-full rounded-lg border border-white/20 bg-card px-2.5 py-1.5 text-xs text-white font-mono font-bold"
                              />
                              <p className="text-[10px] text-white/40 mt-0.5">
                                Enter team numbers separated by commas.
                              </p>
                            </div>

                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-white/60 block">
                                Location Landmark
                              </label>
                              <input
                                type="text"
                                value={editingStation.locationHint}
                                onChange={(e) =>
                                  setEditingStation({
                                    ...editingStation,
                                    locationHint: e.target.value
                                  })
                                }
                                placeholder="Amphitheater / Main Canopy"
                                className="w-full rounded-lg border border-white/20 bg-card px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-white/60 block">
                                Station QR Code ID
                              </label>
                              <input
                                type="text"
                                value={editingStation.qrCode}
                                onChange={(e) =>
                                  setEditingStation({
                                    ...editingStation,
                                    qrCode: e.target.value.trim().toUpperCase()
                                  })
                                }
                                className="w-full rounded-lg border border-white/20 bg-card px-2.5 py-1.5 text-xs text-gold font-mono uppercase font-bold"
                              />
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => {
                                  const teamNums = editingStation.allowedTeamsInput
                                    .split(',')
                                    .map((s) => parseInt(s.trim(), 10))
                                    .filter((n) => !isNaN(n));
                                  if (teamNums.length === 0) {
                                    alert('Please specify at least one allowed team number.');
                                    return;
                                  }
                                  handleUpdateStation(editingStation.stationId, {
                                    allowedTeamNumbers: teamNums,
                                    locationHint: editingStation.locationHint,
                                    qrCode: editingStation.qrCode
                                  });
                                }}
                                className="flex-1 rounded-lg bg-gold py-1.5 text-xs font-bold text-bg hover:bg-gold/90 transition"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => setEditingStation(null)}
                                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-[11px] text-white/70 min-h-[1.5rem]">{st.locationHint}</p>

                            <div className="text-[10px] bg-gold/15 text-gold px-3 py-1 rounded-full font-bold border border-gold/30">
                              Allowed: Team {(st.allowedTeams || []).join(' & Team ')}
                            </div>

                            {st.qrImage && (
                              <div className="p-2.5 bg-white rounded-2xl shadow-md my-1 border border-white/20">
                                <img
                                  src={st.qrImage}
                                  alt={st.stationId}
                                  className="w-40 h-40 mx-auto object-contain"
                                />
                              </div>
                            )}

                            <div className="text-[10px] font-mono text-white/60 bg-black/50 px-2 py-1 rounded w-full truncate border border-white/5">
                              {st.qrCode}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 5: 6 Station QRs */}
            {tab === 'game_qrs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/70">
                    Physical station QR codes for marshals to display at their challenge post.
                  </p>
                  <button onClick={() => window.print()} className="text-xs text-gold underline">
                    Print All
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {gameQrs.map((g) => (
                    <div
                      key={g.gameName}
                      className="rounded-2xl border border-white/10 bg-inset p-4 flex flex-col items-center text-center space-y-2"
                    >
                      <span className="text-xs font-bold uppercase tracking-wider text-gold">
                        {g.title}
                      </span>
                      <p className="text-[11px] text-white/60">{g.locationHint}</p>

                      {g.qrImage && (
                        <div className="p-2 bg-white rounded-xl shadow my-2">
                          <img src={g.qrImage} alt={g.gameName} className="w-36 h-36 mx-auto" />
                        </div>
                      )}

                      <div className="text-[10px] font-mono text-white/50 bg-black/40 px-2 py-1 rounded">
                        {g.qrCode}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 6: Reset */}
            {tab === 'reset' && (
              <div className="rounded-2xl border border-red-500/30 bg-inset p-5 space-y-4">
                <h4 className="text-sm font-bold text-red-300 uppercase tracking-wider">
                  Reset Hunt
                </h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  Reset all 10 teams' steps, scores, timestamps, and photo submissions back to 0.
                </p>
                <button
                  onClick={handleResetAll}
                  className="rounded-xl bg-crimson px-5 py-3 text-xs font-bold text-white hover:bg-crimson/80 transition"
                >
                  Reset All 10 Teams
                </button>
              </div>
            )}
          </div>
        )}

        {/* Deny / Request Retry Modal Popup */}
        {denyingTeam && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4">
            <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-card p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div>
                  <h4 className="font-serif text-lg font-bold text-red-300">
                    Request Retry for Team {denyingTeam.team_number} ({denyingTeam.name})
                  </h4>
                  <p className="text-xs text-white/60">
                    Station:{' '}
                    <strong className="text-gold">
                      {selectedStation || denyingTeam.currentGame || 'Current Trial'}
                    </strong>
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
                <label className="text-xs text-white/70 block">Select a Quick Reason or Type Below:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    'Clue / colours not found yet',
                    'Puzzle incomplete / incorrect',
                    'Wrong movie / riddle answer',
                    'Photo blurry or wrong relic',
                    'Follow coordinator instructions'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCustomDenyReason(preset)}
                      className="rounded-lg bg-inset border border-white/10 px-2 py-1.5 text-[11px] text-white/80 hover:bg-white/10 text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-white/70 block mb-1">Custom Coordinator Instructions:</label>
                <textarea
                  value={customDenyReason}
                  onChange={(e) => setCustomDenyReason(e.target.value)}
                  placeholder="e.g. Please find both colour clues before presenting to coordinator..."
                  rows={3}
                  className="w-full rounded-xl border border-white/20 bg-inset p-2.5 text-xs text-white placeholder-white/30 focus:border-red-400 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() =>
                    handleMarshalDeny(
                      denyingTeam.id,
                      customDenyReason ||
                        'Coordinator requested a retry. Please review the instructions and try again!',
                      selectedStation || denyingTeam.currentGame
                    )
                  }
                  className="flex-1 rounded-xl bg-crimson py-2.5 text-xs font-bold text-white hover:bg-red-700 transition shadow"
                >
                  Send Retry Notice to Team
                </button>
                <button
                  onClick={() => setDenyingTeam(null)}
                  className="rounded-xl bg-white/10 px-4 py-2.5 text-xs text-white/70 hover:bg-white/20"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enlarged Photo popup */}
        {enlargedPhoto && (
          <div
            onClick={() => setEnlargedPhoto(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          >
            <div className="relative max-w-md">
              <img src={enlargedPhoto} alt="Enlarged" className="rounded-2xl max-h-[85vh] shadow-2xl" />
              <button
                onClick={() => setEnlargedPhoto(null)}
                aria-label="Close"
                className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-card border border-gold text-gold flex items-center justify-center shadow hover:bg-gold hover:text-bg transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-white/10 py-3 text-xs font-semibold text-white/70 hover:bg-white/20 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}
