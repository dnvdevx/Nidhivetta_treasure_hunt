import React from 'react';

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-white/10 pb-2 text-sm">
      <span className="text-white/60">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

export default function ProfileModal({ isOpen, onClose, team, member, onLogout }) {
  if (!isOpen || !team) return null;

  const WORD = 'KERALAM'.split('');
  const done = team.current_step || 0;
  const points = team.points || 0;
  const members = team.members || [];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-gold/40 bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-gold/20 pb-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gold font-bold">Team Profile</p>
            <h2 className="text-2xl font-bold text-white mt-0.5">{team.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-white/60 hover:text-white p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {member && (
          <div className="mt-3 rounded-xl bg-inset p-3 border border-white/10">
            <span className="text-[10px] uppercase tracking-wider text-white/50 block">Logged in as</span>
            <p className="font-semibold text-sm text-gold mt-0.5 flex items-center justify-between">
              <span>{member.name}</span>
              {(member.isLeader || member.is_leader) && (
                <span className="text-[10px] bg-gold/20 text-gold px-2 py-0.5 rounded-full border border-gold/40">
                  Team Leader
                </span>
              )}
            </p>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <Row label="Hunt Status" value={done >= WORD.length ? 'All Letters Found' : `Trial ${done + 1} of 7`} />
          <Row label="Tasks completed" value={`${done} / ${WORD.length}`} />
          <Row label="Letters found" value={WORD.slice(0, done).join(' ') || '—'} />
        </div>

        {/* Members list */}
        <div className="mt-5">
          <h4 className="text-xs uppercase tracking-wider text-gold font-semibold mb-2">
            Team Roster ({members.length} members)
          </h4>
          <div className="space-y-1.5">
            {members.map((m) => (
              <div
                key={m.id || m.reg_no || m.regNo}
                className="flex items-center justify-between rounded-xl bg-inset/70 px-3 py-2 text-xs border border-white/5"
              >
                <div>
                  <span className="font-medium text-white">{m.name}</span>
                  {(m.reg_no || m.regNo) && (
                    <span className="text-white/40 ml-2">({m.reg_no || m.regNo})</span>
                  )}
                </div>
                {(m.is_leader || m.isLeader) && (
                  <span className="text-[9px] text-gold font-bold uppercase tracking-wider">
                    Leader
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <button
            onClick={onLogout}
            className="w-full rounded-xl border border-red-500/40 bg-red-950/40 py-2.5 text-xs font-bold text-red-200 hover:bg-red-900/50 transition"
          >
            Log Out from Team
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-gold py-3 text-xs font-bold text-bg hover:bg-gold/90 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
