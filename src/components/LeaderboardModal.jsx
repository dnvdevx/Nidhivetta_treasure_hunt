import React, { useEffect, useState } from 'react';

export default function LeaderboardModal({ isOpen, onClose, currentTeamId }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => {
            if ((b.current_step || 0) !== (a.current_step || 0)) {
              return (b.current_step || 0) - (a.current_step || 0);
            }
            if (a.completed_at && b.completed_at) {
              const diff = new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
              if (diff !== 0) return diff;
            }
            if (a.completed_at) return -1;
            if (b.completed_at) return 1;
            if ((b.points || 0) !== (a.points || 0)) {
              return (b.points || 0) - (a.points || 0);
            }
            return (a.team_number || 0) - (b.team_number || 0);
          })
        : [];
      setTeams(sorted);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
      const interval = setInterval(fetchLeaderboard, 10000); // auto-refresh every 10s
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-md rounded-3xl border border-gold/40 bg-card p-6 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gold/20 pb-3">
          <div>
            <h3 className="font-serif text-2xl font-bold text-gold">Live Leaderboard</h3>
            <p className="text-[11px] text-white/50 tracking-wider uppercase mt-0.5">Thanima Nidhiveta Standings</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-white/60 hover:text-white p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-2.5">
          {loading && teams.length === 0 ? (
            <div className="text-center py-10 text-white/50 text-xs">Loading standings...</div>
          ) : teams.length === 0 ? (
            <div className="text-center py-10 text-white/50 text-xs">No teams registered yet. Be the first!</div>
          ) : (
            teams.map((t, idx) => {
              const isCurrent = t.id === currentTeamId;
              const isFinished = t.current_step >= 7;

              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                    isCurrent
                      ? 'border-gold bg-gold/15'
                      : 'border-white/10 bg-inset/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        idx === 0
                          ? 'bg-gold text-bg'
                          : idx === 1
                          ? 'bg-cream text-bg'
                          : idx === 2
                          ? 'bg-amber-600 text-white'
                          : 'bg-white/10 text-white/70'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-sm text-white flex items-center gap-1.5">
                        {t.name}
                        {isCurrent && (
                          <span className="text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded-full border border-gold/30">
                            You
                          </span>
                        )}
                        {isFinished && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/30 font-medium">
                            Done
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-white/50">
                        {t.current_step} / 7 Letters Found
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-xs text-gold">
                      {t.current_step >= 7 ? '7/7 Letters' : `Step ${t.current_step}/7`}
                    </span>
                    {t.completed_at && (
                      <p className="text-[10px] text-emerald-400 font-medium">Finished</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-gold py-3 text-xs font-bold text-bg hover:bg-gold/90 transition"
        >
          Back to Hunt
        </button>
      </div>
    </div>
  );
}
