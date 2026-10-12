import { useEffect, useState } from 'react'

const WORD = 'KERALAM'.split('')

// One task per letter. Replace with your real tasks / hints.
const TASKS = [
  { name: 'Task 1', info: 'Task instructions and hint appear here.' },
  { name: 'Task 2', info: 'Task instructions and hint appear here.' },
  { name: 'Task 3', info: 'Task instructions and hint appear here.' },
  { name: 'Task 4', info: 'Task instructions and hint appear here.' },
  { name: 'Task 5', info: 'Task instructions and hint appear here.' },
  { name: 'Task 6', info: 'Task instructions and hint appear here.' },
  { name: 'Task 7', info: 'Task instructions and hint appear here.' },
]
const POINTS_PER_TASK = 150
const TEAM_NAME = 'Registered Team Name' // load from your registration data
const MAP_URL = 'https://www.google.com/maps/search/?api=1&query=VIT+Chennai'

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-white/10 pb-2">
      <span className="text-white/60">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

export default function App() {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(() => {
    const saved = Number(localStorage.getItem('tt_done'))
    return Number.isFinite(saved) ? Math.min(saved, WORD.length) : 0
  })

  useEffect(() => localStorage.setItem('tt_done', String(done)), [done])

  const points = done * POINTS_PER_TASK
  const progress = (done / WORD.length) * 100
  const finished = done === WORD.length
  const task = TASKS[done]

  // Call this when a QR code is verified / a task is completed.
  const completeTask = () => setDone((d) => Math.min(d + 1, WORD.length))

  return (
    <div className="min-h-screen flex justify-center">
      <div className="w-full max-w-[420px] px-5 pb-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gold/40 py-5">
          <div>
            <h1 className="font-serif text-[28px] font-bold tracking-wide text-gold leading-none">THANIMA</h1>
            <p className="mt-1 text-[11px] tracking-[0.2em] text-gold/90">THE TREASURE HUNT</p>
          </div>
          <button onClick={() => setOpen(true)} aria-label="Profile" className="p-1 text-gold active:scale-90 transition">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
            </svg>
          </button>
        </header>

        {/* KERALAM letters */}
        <section className="mt-5 flex justify-between rounded-2xl border-2 border-ring bg-inset/60 p-3">
          {WORD.map((letter, i) => {
            const lit = i < done
            return (
              <div
                key={i}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-serif text-lg font-bold transition-colors duration-500
                  ${lit
                    ? 'animate-glow border-cream bg-cream text-bg'
                    : 'border-ring bg-card text-cream/90'}`}
              >
                {letter}
              </div>
            )
          })}
        </section>

        {/* Welcome + points */}
        <section className="mt-4 rounded-2xl bg-card p-5">
          <p className="text-sm uppercase tracking-wide text-white/90">Welcome, team</p>
          <h2 className="mt-1 font-sans text-2xl font-bold">{TEAM_NAME}</h2>

          <div className="mt-4 rounded-xl bg-inset px-8 py-6">
            <p className="text-5xl font-bold leading-none">{points}</p>
            <p className="mt-2 text-sm text-white/60">Team points</p>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span>Team progress</span>
            <span className="text-gold">{progress.toFixed(1).replace(/\.0$/, '')}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-inset">
            <div
              className="h-full rounded-full bg-gold transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        {/* Actions */}
        <section className="mt-4 grid grid-cols-2 gap-3">
          <a
            href={MAP_URL}
            target="_blank"
            rel="noreferrer"
            className="flex h-28 flex-col items-center justify-center rounded-2xl bg-cream text-center text-bg active:scale-95 transition"
          >
            <span className="text-lg font-bold">Treasure Map</span>
            <span className="mt-2 text-sm text-bg/60">Open VIT<br />Chennai map</span>
          </a>
          <button
            onClick={completeTask}
            disabled={finished}
            className="flex h-28 flex-col items-center justify-center rounded-2xl bg-crimson text-center active:scale-95 transition disabled:opacity-60"
          >
            <span className="text-lg font-bold">Scan QR</span>
            <span className="mt-2 text-sm text-gold">Unlock next clue</span>
          </button>
        </section>

        {/* Current task */}
        <section className="mt-4 rounded-2xl bg-card p-5">
          <p className="text-sm uppercase tracking-wide text-gold">Current task</p>
          {finished ? (
            <>
              <h3 className="mt-2 text-xl font-bold">KERALAM complete! 🎉</h3>
              <p className="mt-1 text-sm text-white/60">You found every clue. Report to the organisers.</p>
            </>
          ) : (
            <>
              <h3 className="mt-2 text-xl font-bold">{task.name}</h3>
              <p className="mt-1 text-sm text-white/60">{task.info}</p>
            </>
          )}
        </section>

        <button
          onClick={() => setDone(0)}
          className="mt-6 w-full text-center text-xs text-white/30 hover:text-white/60"
        >
          Reset demo
        </button>
      </div>

      {/* Profile popup */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[360px] rounded-2xl border border-gold/40 bg-card p-6"
          >
            <p className="text-sm uppercase tracking-wide text-gold">Team profile</p>
            <h2 className="mt-1 text-2xl font-bold">{TEAM_NAME}</h2>
            <div className="mt-4 space-y-3 text-sm">
              <Row label="Team points" value={points} />
              <Row label="Tasks completed" value={`${done} / ${WORD.length}`} />
              <Row label="Letters found" value={WORD.slice(0, done).join(' ') || '—'} />
            </div>
            <button
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-xl bg-gold py-3 font-bold text-bg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
