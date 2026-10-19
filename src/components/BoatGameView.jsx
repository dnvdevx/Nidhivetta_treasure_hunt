import React, { useState } from 'react';

const FALLBACK_LOCATIONS = [
  {
    locationNumber: 1,
    title: 'Location 1: The Gathering Spot (Northwest)',
    riddle: 'Guided by the compass, seek the direction that lies between the setting sun and the midnight hour. Within this part of the campus lies a familiar gathering spot, now featuring a newly created space where one can pause and unwind.',
    boatCount: 2
  },
  {
    locationNumber: 2,
    title: 'Location 2: The Polished Stone Seats',
    riddle: 'Stone-like seats with a polished glow, Where tired feet pause before they go. Not quite a hall, nor a place to read, Between a place of learning and a stage of talents, Lies a resting spot within your reach. Find where glossy rocks serve your needs. Your next clue awaits where people sit.',
    boatCount: 2
  },
  {
    locationNumber: 3,
    title: 'Location 3: Racket & Ripple',
    riddle: 'Shuttles fly on one side, splashes on the other. Find the spot where the racket meets the ripple.',
    boatCount: 2
  },
  {
    locationNumber: 4,
    title: 'Location 4: The Newborn Court',
    riddle: 'Among the old, a newborn stands tall, The youngest member among them all. Seek the place where quick reflexes reign, And a feathered object dances across the terrain.',
    boatCount: 2
  },
  {
    locationNumber: 5,
    title: 'Location 5: The Contours of Nature',
    riddle: "Where the earth wears a crown and the winds whisper tales of youthful adventures, countless moments of joy unfold. A familiar pursuit finds its home where nature's contours take an unexpected turn, inviting those who seek it to look beyond the obvious.",
    boatCount: 2
  }
];

export default function BoatGameView({ task, onTaskCompleted, onSyncState }) {
  const boatQuestion = task?.boatQuestion || {};
  const isInitiallyUnlocked = Boolean(boatQuestion.isQuestionUnlocked);

  // The claimed question always comes from the server (task.boatQuestion)
  const [questionUnlocked, setQuestionUnlocked] = useState(isInitiallyUnlocked);
  const [unlockedQuestionText, setUnlockedQuestionText] = useState(boatQuestion.question || '');
  const [claimedBoatNum, setClaimedBoatNum] = useState(boatQuestion.questionBoatNumber || null);
  const [questionCodeInput, setQuestionCodeInput] = useState('');
  const [answerCodeInput, setAnswerCodeInput] = useState('');
  const [activeLocTab, setActiveLocTab] = useState(1);
  const [showAllLocations, setShowAllLocations] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const locations = (task?.boatLocations && task.boatLocations.length > 0)
    ? task.boatLocations
    : FALLBACK_LOCATIONS;

  const currentLoc = locations.find((l) => l.locationNumber === activeLocTab) || locations[0];

  // Keep state in sync with the server (background polls, or an organizer releasing the claim)
  React.useEffect(() => {
    if (!task?.boatQuestion) return;
    const unlocked = Boolean(task.boatQuestion.isQuestionUnlocked);
    setQuestionUnlocked(unlocked);
    setUnlockedQuestionText(unlocked ? task.boatQuestion.question || '' : '');
    setClaimedBoatNum(unlocked ? task.boatQuestion.questionBoatNumber || null : null);
  }, [task]);

  // Step 1: Unlock Question using Question Boat code
  const handleUnlockQuestion = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const clean = questionCodeInput.trim().toUpperCase();
    if (!clean || clean.length !== 6) {
      setError('Please enter the 6-character Question Boat code.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('thanima_token');
      const res = await fetch('/api/boat-game/unlock-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ questionCode: clean })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to unlock question.');
      }

      setQuestionUnlocked(true);
      const qNum = data.boatQuestion?.questionBoatNumber;
      const qText = data.question || data.boatQuestion?.question || '';
      if (qNum) setClaimedBoatNum(qNum);
      if (qText) setUnlockedQuestionText(qText);
      setSuccessMsg(data.message || 'Question Unlocked! Now find the boat displaying the correct answer.');
      if (onSyncState) onSyncState();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Answer using Answer Boat code
  const handleVerifyAnswer = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const clean = answerCodeInput.trim().toUpperCase();
    if (!clean || clean.length !== 6) {
      setError('Please enter the 6-character Answer Boat code.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('thanima_token');

      const res = await fetch('/api/boat-game/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: clean })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Answer verification failed.');
      }

      setSuccessMsg(data.message || 'Splendid victory! Correct vessel discovered!');
      if (onTaskCompleted) {
        onTaskCompleted(data);
      }
      if (onSyncState) {
        onSyncState();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Overview Banner: Authentic Vallamkali Challenge */}
      <div className="rounded-2xl border border-gold/40 bg-gradient-to-b from-[#2b0a07] via-card to-inset p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-serif text-base font-bold text-gold">Vallamkali Boat Challenge</h4>
            <p className="text-[11px] text-white/70">5 Campus Locations • 2 Boats Per Location</p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-gold/40 bg-gold/15 text-gold">
            {questionUnlocked ? 'Step 2: Answer Code' : 'Step 1: Question Code'}
          </span>
        </div>
        <p className="mt-2 text-xs text-white/80 leading-relaxed italic border-t border-white/10 pt-2 font-serif">
          "Inspired by Kerala’s traditional Vallamkali, this challenge tests your observation, knowledge, and teamwork. Five locations hold boats containing hidden codes and clues."
        </p>
      </div>

      {/* 5 Hidden Campus Locations Selector */}
      <div className="rounded-2xl border border-gold/30 bg-inset/90 p-4 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div>
            <h5 className="font-serif text-xs font-bold text-gold uppercase tracking-wider">
              5 Campus Boat Locations
            </h5>
            <p className="text-[10px] text-white/60">2 Question Boats hidden at each location</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAllLocations(!showAllLocations)}
            className="text-[11px] text-gold font-semibold hover:underline"
          >
            {showAllLocations ? 'Collapse Clues' : 'Expand Clues'}
          </button>
        </div>

        {showAllLocations && (
          <div className="space-y-3 pt-1">
            {/* Location Tabs (1 to 5) */}
            <div className="grid grid-cols-5 gap-1.5">
              {locations.map((loc) => {
                const isActive = loc.locationNumber === activeLocTab;
                return (
                  <button
                    key={loc.locationNumber}
                    type="button"
                    onClick={() => setActiveLocTab(loc.locationNumber)}
                    className={`py-2 px-1 rounded-xl text-center font-bold text-xs transition border flex flex-col items-center justify-center gap-0.5 ${
                      isActive
                        ? 'border-gold bg-gold text-bg shadow-md scale-105'
                        : 'border-white/10 bg-card text-white/70 hover:border-gold/40 hover:text-white'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-black">Loc</span>
                    <span className="text-sm font-black leading-none">{loc.locationNumber}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Location Riddle Card */}
            {currentLoc && (
              <div className="rounded-xl border border-gold/40 bg-card/90 p-3.5 space-y-2 animate-fadeIn shadow-inner">
                <div className="flex items-center justify-between text-[11px] font-bold text-gold">
                  <span>{currentLoc.title || `Location ${currentLoc.locationNumber}`}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gold/15 border border-gold/30 text-gold">
                    2 Boats Hidden Here
                  </span>
                </div>
                <div className="rounded-lg bg-inset/80 p-3 border border-white/5">
                  <p className="text-xs text-white/95 leading-relaxed font-serif italic">
                    "{currentLoc.riddle}"
                  </p>
                </div>
                <p className="text-[10px] text-white/50 text-center">
                  Search this location to find a Question Boat, then enter its 6-character code below!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/80 p-3 text-xs text-red-200 leading-relaxed animate-shake">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/80 p-3 text-xs text-emerald-200 font-bold leading-relaxed animate-pulse">
          {successMsg}
        </div>
      )}

      {/* PHASE 1: Find Question Boat & Enter Code */}
      {!questionUnlocked ? (
        <div className="rounded-2xl border border-gold/30 bg-inset/90 p-4 space-y-4 shadow-lg">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-bg text-xs font-black">
                1
              </span>
              <h5 className="font-serif text-sm font-bold text-white">
                Enter Code from ANY Question Boat You Find
              </h5>
            </div>
            <p className="text-xs text-white/70 leading-relaxed pl-8">
              Explore any of the 5 locations above to find a Question Boat. Enter its <strong>6-character Question Code</strong> below to unlock your challenge question (first come, first served; exclusively claimed by your team)!
            </p>
          </div>

          <form onSubmit={handleUnlockQuestion} className="space-y-3 pt-2 border-t border-white/10">
            <label className="block text-center text-[11px] font-bold uppercase tracking-wider text-gold/90">
              Enter 6-Character Question Boat Code
            </label>

            <div className="flex justify-center">
              <input
                type="text"
                maxLength={6}
                value={questionCodeInput}
                onChange={(e) => setQuestionCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="------"
                className="w-full max-w-[220px] rounded-xl border border-gold/40 bg-card py-3 px-4 text-center font-mono text-2xl font-bold tracking-[0.25em] text-gold uppercase placeholder-white/20 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 shadow-inner"
                required
                autoComplete="off"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || questionCodeInput.trim().length !== 6}
              className="w-full rounded-xl bg-gold py-3 text-xs font-bold text-bg transition hover:bg-gold/90 active:scale-95 disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? 'Unlocking Question...' : 'Unlock Challenge Question'}
            </button>
          </form>
        </div>
      ) : (
        /* PHASE 2: Question is Unlocked! Solve and find Answer Boat */
        <div className="space-y-4">
          {/* Unlocked Question Card */}
          <div className="rounded-2xl border-2 border-gold/50 bg-inset p-4 space-y-2 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {claimedBoatNum ? `Question Boat #${claimedBoatNum} Locked to Your Team` : 'Question Unlocked'}
              </span>
              <span className="text-[10px] text-white/40">Step 1 Complete</span>
            </div>

            <div className="rounded-xl bg-black/40 p-3 border border-gold/20">
              <p className="font-serif text-sm text-cream font-semibold leading-relaxed">
                "{unlockedQuestionText || boatQuestion.question}"
              </p>
            </div>
          </div>

          {/* Answer Code Input Card */}
          <div className="rounded-2xl border border-gold/30 bg-inset/90 p-4 space-y-4 shadow-lg">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-crimson text-white text-xs font-black">
                  2
                </span>
                <h5 className="font-serif text-sm font-bold text-white">
                  Solve & Find the Answer Boat
                </h5>
              </div>
              <p className="text-xs text-white/70 leading-relaxed pl-8">
                Solve the question above with your team. Search the boats to locate the vessel displaying this exact answer. Inscribe its <strong>6-character Answer Code</strong> below:
              </p>
            </div>

            <form onSubmit={handleVerifyAnswer} className="space-y-3 pt-2 border-t border-white/10">
              <label className="block text-center text-[11px] font-bold uppercase tracking-wider text-gold/90">
                Enter 6-Character Answer Code
              </label>

              <div className="flex justify-center">
                <input
                  type="text"
                  maxLength={6}
                  value={answerCodeInput}
                  onChange={(e) => setAnswerCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="------"
                  className="w-full max-w-[220px] rounded-xl border border-gold/40 bg-card py-3 px-4 text-center font-mono text-2xl font-bold tracking-[0.25em] text-gold uppercase placeholder-white/20 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 shadow-inner"
                  required
                  autoComplete="off"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || answerCodeInput.trim().length !== 6}
                className="w-full rounded-xl bg-gold py-3.5 text-sm font-bold text-bg transition hover:bg-gold/90 active:scale-95 disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? 'Verifying Answer Vessel...' : 'Verify Answer & Complete Trial'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
