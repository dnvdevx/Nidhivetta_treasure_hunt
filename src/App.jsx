import { useEffect, useState } from 'react';
import AuthModal from './components/AuthModal';
import QRScannerModal from './components/QRScannerModal';
import LeaderboardModal from './components/LeaderboardModal';
import ProfileModal from './components/ProfileModal';
import AdminModal from './components/AdminModal';
import PhotoGameView from './components/PhotoGameView';
import BoatGameView from './components/BoatGameView';
import GameRulesCard from './components/GameRulesCard';
import ErrorBoundary from './components/ErrorBoundary';

import GameAdminPage from './components/GameAdminPage';

const WORD = ['K', 'E', 'R', 'A', 'L', 'A', 'M'];
const POINTS_PER_TASK = 150;

export default function App() {
  // If accessing /game_admin, render dedicated Organizers & Marshals Page
  const isGameAdmin =
    typeof window !== 'undefined' &&
    (window.location.pathname.startsWith('/game_admin') ||
      window.location.pathname.startsWith('/admin') ||
      new URLSearchParams(window.location.search).has('game_admin'));

  if (isGameAdmin) {
    return <GameAdminPage />;
  }

  const [token, setToken] = useState(() => localStorage.getItem('thanima_token'));
  const [team, setTeam] = useState(null);
  const [member, setMember] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [profileOpen, setProfileOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  // Toast / celebration message
  const [toast, setToast] = useState('');

  // Check if URL has starting QR code (e.g. ?start_qr=THANIMA-START-STATION-1)
  const [initialStationQr, setInitialStationQr] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('start_qr') || params.get('qr') || '';
  });

  // Fetch or sync current team state
  const syncTeamState = async (authToken) => {
    const activeToken = authToken || token;
    if (!activeToken) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/teams/me', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });

      if (!res.ok) {
        localStorage.removeItem('thanima_token');
        setToken(null);
        setTeam(null);
        setMember(null);
        setCurrentTask(null);
        return;
      }

      const data = await res.json();
      setTeam(data.team);
      setMember(data.member);
      setCurrentTask(data.currentTask);
    } catch (err) {
      console.error('Failed to sync team state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncTeamState();

    // Poll team state every 5s so all teammates stay in instant sync
    const interval = setInterval(() => {
      if (token) syncTeamState();
    }, 5000);

    return () => clearInterval(interval);
  }, [token]);

  const handleAuthSuccess = ({ team, member, currentTask }) => {
    setToken(localStorage.getItem('thanima_token'));
    setTeam(team);
    setMember(member);
    setCurrentTask(currentTask);
    showToast(`Welcome ${team.name}! First Gate Passed. Letter "K" Unlocked!`);
  };

  const handleLogout = () => {
    localStorage.removeItem('thanima_token');
    setToken(null);
    setTeam(null);
    setMember(null);
    setCurrentTask(null);
    setProfileOpen(false);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 6000);
  };

  const handleScanSuccess = (scanData) => {
    if (scanData.team) {
      setTeam(scanData.team);
      setCurrentTask(scanData.currentTask);
    } else {
      syncTeamState();
    }
    showToast(scanData.message || 'Challenge passed! Letter unlocked!');
  };

  const done = team ? team.current_step : 0;
  const points = team ? team.points : done * POINTS_PER_TASK;
  const progress = (done / WORD.length) * 100;
  const isFinished = done >= WORD.length;
  // Mystery 'M' rule: Only reveal 'M' when 6th task is finished (done >= 6)
  const isMRevealed = done >= 6;

  return (
    <div className="min-h-screen flex justify-center bg-bg text-white font-sans selection:bg-gold selection:text-bg">
      <div className="w-full max-w-md px-3.5 sm:px-5 pb-16 overflow-x-hidden">
        {/* Toast Alert */}
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm rounded-2xl border-2 border-gold bg-card/95 p-3.5 shadow-2xl backdrop-blur text-center text-xs sm:text-sm font-bold text-gold animate-bounce">
            {toast}
          </div>
        )}

        {/* Header */}
        <header className="flex items-center justify-between border-b border-gold/40 py-3.5">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Thanima Logo"
              className="h-10 max-h-10 sm:h-12 sm:max-h-12 w-auto object-contain drop-shadow"
            />
            <div>
              <p className="text-[10px] sm:text-[11px] tracking-[0.2em] text-gold/90 font-semibold uppercase">
                NIDHIVETTA TREASURE HUNT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Leaderboard button */}
            <button
              onClick={() => setLeaderboardOpen(true)}
              aria-label="Leaderboard"
              title="Live Leaderboard"
              className="p-2 text-gold hover:text-cream active:scale-90 transition rounded-full hover:bg-white/5"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
            </button>

            {/* Profile button */}
            <button
              onClick={() => setProfileOpen(true)}
              aria-label="Profile"
              title="Team Profile"
              className="p-2 text-gold hover:text-cream active:scale-90 transition rounded-full hover:bg-white/5"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
              </svg>
            </button>
          </div>
        </header>

        {/* KERALAM Letters Row with Mystery Tiger / 'M' Slot */}
        <section className="mt-4 flex justify-between gap-1 rounded-2xl border-2 border-ring bg-inset/60 p-2.5 sm:p-3 shadow-inner">
          {WORD.map((letter, i) => {
            const isLastLetter = i === 6; // 'M'
            const isLit = i < done;

            return (
              <div
                key={i}
                className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 font-serif text-base sm:text-lg font-bold transition-all duration-700 overflow-hidden
                  ${
                    isLit
                      ? 'animate-glow border-cream bg-cream text-bg scale-105 shadow-lg'
                      : isLastLetter && isMRevealed
                      ? 'border-gold bg-gold/20 text-gold animate-pulse scale-105 shadow-md'
                      : isLastLetter
                      ? 'border-gold/50 bg-inset p-0.5 shadow'
                      : 'border-ring bg-card text-cream/70'
                  }`}
              >
                {isLastLetter ? (
                  isMRevealed ? (
                    'M'
                  ) : (
                    <img
                      src="/tiger.png"
                      alt="Tiger Mystery"
                      className="h-full w-full object-cover rounded-full"
                    />
                  )
                ) : (
                  letter
                )}
              </div>
            );
          })}
        </section>

        {/* Secret notice banner if M is revealed */}
        {isMRevealed && !isFinished && (
          <div className="mt-2.5 rounded-xl border border-gold/40 bg-gold/15 p-2.5 text-center text-xs font-semibold text-gold animate-pulse">
            MYSTERY UNLOCKED: Letter "M" has materialized on your board! Proceed to the Final Challenge!
          </div>
        )}

        {/* Welcome + points */}
        <section className="mt-4 rounded-2xl bg-card p-5 border border-gold/15 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">Welcome</p>
              <h2 className="mt-0.5 font-serif text-2xl font-bold text-gold">
                {team ? team.name : 'Waiting for Team...'}
              </h2>
            </div>
            {member && (
              <span className="text-xs bg-gold/15 text-gold px-2.5 py-1 rounded-full border border-gold/30">
                {member.name}
              </span>
            )}
          </div>

          <div className="mt-4 rounded-xl bg-inset px-6 py-5 flex items-center justify-between border border-white/5">
            <div>
              <p className="text-4xl font-bold leading-none text-white">{points}</p>
              <p className="mt-1.5 text-xs text-white/60">Total Points</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gold">
                {done} of {WORD.length}
              </span>
              <p className="text-xs text-white/50">Trials Conquered</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-white/70">Hunt Progress</span>
            <span className="font-bold text-gold">{progress.toFixed(1).replace(/\.0$/, '')}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-inset">
            <div
              className="h-full rounded-full bg-gold transition-all duration-700 shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        {/* Current task Clue Section */}
        <section className="mt-4 rounded-2xl bg-card p-5 border border-gold/15 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <span className="text-[10px] uppercase tracking-wider text-gold font-bold bg-gold/15 border border-gold/30 px-2.5 py-0.5 rounded-full">
              Mission {done + 1} of 7 • Letter "{done === 6 ? 'Final M' : WORD[done]}"
            </span>
            <span className="text-xs font-serif font-bold text-cream/70">
              {currentTask?.gameName || 'Trial Station'}
            </span>
          </div>

          {isFinished ? (
            <div className="text-center py-4 space-y-2">
              <h3 className="font-serif text-2xl font-bold text-gold">KERALAM COMPLETE!</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                Splendid triumph! Your team has discovered all seven letters of KERALAM.
                Proceed immediately to the Organizers Stage to claim your grand victory!
              </p>
            </div>
          ) : currentTask ? (
            <div className="mt-3 space-y-3.5">
              {/* Coordinator Feedback Banner (if coordinator denied / asked for retry) */}
              {team?.marshal_feedback && (
                <div className="rounded-xl border border-red-500/50 bg-red-950/80 p-3.5 text-xs text-red-200 space-y-1 shadow-lg animate-pulse">
                  <div className="font-bold text-red-300">
                    Coordinator Notice ({team.marshal_feedback.gameName})
                  </div>
                  <p className="font-semibold text-white/95">{team.marshal_feedback.reason}</p>
                  <p className="text-[10px] text-red-300/70 italic">Please review the instructions, adjust your attempt, and present to the coordinator again.</p>
                </div>
              )}

              {/* SCREEN TITLE: Task / Game Name Prominently Displayed */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-bg text-xs font-black">
                    {done + 1}
                  </span>
                  <h3 className="font-serif text-2xl font-bold text-gold tracking-tight">
                    {currentTask.gameName || currentTask.clueTitle}
                  </h3>
                </div>
                {currentTask.clueTitle && currentTask.clueTitle !== currentTask.gameName && (
                  <p className="text-xs font-serif text-cream/70 italic pl-8">
                    "{currentTask.clueTitle}"
                  </p>
                )}
              </div>

              {/* Station Riddle & Location Clue */}
              <div className="rounded-xl border border-white/10 bg-inset/80 p-3.5 space-y-2 shadow-inner">
                <div className="flex items-center justify-between text-[11px] font-bold text-gold uppercase tracking-wider">
                  <span>Station Riddle</span>
                  <span className="text-[10px] text-white/40 font-normal">
                    Solve to find location
                  </span>
                </div>
                <p className="text-xs text-white/90 leading-relaxed italic whitespace-pre-line">
                  "{currentTask.riddle}"
                </p>
                {currentTask.crypticHint && (
                  <p className="text-[11px] text-gold/90 flex items-center gap-1 pt-1.5 border-t border-white/5">
                    Location Hint: <span className="text-white/80">{currentTask.crypticHint}</span>
                  </p>
                )}
              </div>

              {/* RULES & REGULATIONS OF THIS GAME */}
              {currentTask.rules && (
                <GameRulesCard
                  rules={currentTask.rules}
                  gameName={currentTask.gameName || currentTask.internalName}
                />
              )}

              {/* JIGSAW MALAYALAM RIDDLE CARD */}
              {(currentTask.isNumbersOnTrees || currentTask.treeRiddle) && (
                <div className="rounded-2xl border-2 border-gold/40 bg-gradient-to-b from-card to-inset p-4 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div>
                      <h4 className="font-serif text-sm font-bold text-gold">
                        Malayalam Puzzle Clue
                      </h4>
                      <p className="text-[10px] text-white/60">Find the envelope bearing your decoded number</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gold/15 text-gold border border-gold/30">
                      Team {team?.team_number} Code
                    </span>
                  </div>

                  <div className="rounded-xl bg-black/40 border border-gold/30 p-4 text-center space-y-2">
                    <p className="text-[11px] uppercase tracking-wider text-white/50 font-semibold">Decipher the Mystery Number:</p>
                    <div className="font-serif text-2xl font-black text-gold tracking-widest leading-relaxed whitespace-pre-line py-1">
                      {currentTask.treeRiddle || `അ  1\n${currentTask.treeLetter || '?'}  ?`}
                    </div>
                    <p className="text-[11px] text-gold/90 font-medium">
                      Find the number hidden in the clue, then locate the envelope bearing that number.
                    </p>
                    <p className="text-[10px] text-white/60 italic">
                      Inside awaits a puzzle that will lead you to your next clue!
                    </p>
                  </div>

                  {currentTask.sittingArea && (
                    <div className="rounded-lg bg-inset/80 p-2.5 border border-white/5 flex items-center gap-2 text-xs text-cream">
                      <span>Designated Sitting Area: <strong className="text-gold">{currentTask.sittingArea}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* PHOTO GAME INTERACTIVE VIEW */}
              {currentTask.isPhotoGame && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <PhotoGameView
                    task={currentTask}
                    onSyncState={syncTeamState}
                  />
                </div>
              )}

              {/* BOAT GAME INTERACTIVE VIEW */}
              {currentTask.isBoatGame && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <BoatGameView
                    task={currentTask}
                    onSyncState={syncTeamState}
                    onTaskCompleted={handleScanSuccess}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-3 text-xs text-white/50">
              Loading current challenge...
            </div>
          )}
        </section>

        {/* Footer shortcut */}
        <div className="mt-8 text-center text-xs text-white/40">
          <button
            onClick={() => setLeaderboardOpen(true)}
            className="hover:text-gold transition font-medium inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-card border border-white/10 active:scale-95 shadow"
          >
            View Live Standings
          </button>
        </div>
      </div>

      {/* Auth Modal (if no session or team) */}
      {(!token || !team) && !loading && (
        <AuthModal
          initialStationQr={initialStationQr}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        currentTeamId={team ? team.id : null}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        team={team}
        member={member}
        onLogout={handleLogout}
      />
    </div>
  );
}
