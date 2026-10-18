import React, { useState } from 'react';

export default function GameRulesCard({ rules, gameName }) {
  if (!rules || !rules.items || rules.items.length === 0) return null;

  const [isExpanded, setIsExpanded] = useState(true);
  const isHotCold = gameName?.toLowerCase().includes('hot') && gameName?.toLowerCase().includes('cold');

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-lg ${
        isHotCold
          ? 'border-orange-500/40 bg-gradient-to-b from-[#2b0f0a]/95 via-card/95 to-[#0a182b]/95'
          : 'border-gold/30 bg-inset/90'
      }`}
    >
      {/* Header / Toggle Button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3.5 text-left transition hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{isHotCold ? '🔥❄️' : '📜'}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-serif text-sm font-bold text-gold tracking-wide">
                Rules & Regulations
              </h4>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30">
                Official
              </span>
            </div>
            <p className="text-[11px] text-white/60">
              {rules.title || 'Station Instructions'} • {rules.items.length} Rules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-gold/80">
          <span>{isExpanded ? 'Hide' : 'View Rules'}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Rules Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/10 text-xs animate-fadeIn">
          {/* Rules List */}
          <div className="space-y-2.5 pt-1">
            {rules.items.map((item) => (
              <div
                key={item.num}
                className="rounded-xl border border-white/5 bg-black/25 p-2.5 transition hover:border-gold/30"
              >
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-gold/20 text-gold border border-gold/40 text-[10px] font-black">
                    {item.num}
                  </span>
                  <div className="space-y-1 flex-1">
                    <p className="text-white font-semibold leading-snug">
                      <strong className="text-gold font-bold">{item.title}:</strong> {item.text}
                    </p>

                    {/* Sub-items (specifically for Hot and Cold Hints) */}
                    {item.subItems && item.subItems.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5">
                        {item.subItems.map((sub, sIdx) => {
                          const isHot = sub.type === 'hot' || sub.label?.toLowerCase() === 'hot';
                          return (
                            <div
                              key={sIdx}
                              className={`flex items-start gap-2 p-2 rounded-lg border leading-tight ${
                                isHot
                                  ? 'border-orange-500/40 bg-orange-950/40 text-orange-200'
                                  : 'border-cyan-500/40 bg-cyan-950/40 text-cyan-200'
                              }`}
                            >
                              <span className="text-base leading-none">
                                {isHot ? '🔥' : '❄️'}
                              </span>
                              <div>
                                <span
                                  className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                    isHot
                                      ? 'bg-orange-500/30 text-orange-300'
                                      : 'bg-cyan-500/30 text-cyan-300'
                                  }`}
                                >
                                  {sub.label}
                                </span>
                                <p className="text-[11px] mt-1 font-medium">{sub.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Remember Callout */}
          {rules.remember && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 flex items-start gap-2 text-amber-200">
              <span className="text-base leading-none">⭐</span>
              <p className="text-[11px] font-semibold leading-relaxed">
                <strong className="text-amber-300 font-bold uppercase tracking-wider block mb-0.5">
                  Remember
                </strong>
                {rules.remember}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
