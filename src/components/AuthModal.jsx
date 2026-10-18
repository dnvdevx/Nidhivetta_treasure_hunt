import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function AuthModal({ onAuthSuccess, initialStationQr = '', onOpenAdmin }) {
  const [stationQr, setStationQr] = useState(initialStationQr);
  const [teamCode, setTeamCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanningCamera, setScanningCamera] = useState(false);
  const [manualDevMode, setManualDevMode] = useState(false);
  const scannerRef = useRef(null);
  const scannerRegionId = 'start-station-qr-scanner';

  useEffect(() => {
    if (initialStationQr) {
      setStationQr(initialStationQr);
    }
  }, [initialStationQr]);

  const startCameraScanner = async () => {
    setError('');
    setScanningCamera(true);

    try {
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch (_) {}
      }

      // Small delay to ensure DOM element is mounted
      setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode(scannerRegionId);
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 240, height: 240 } },
            async (decodedText) => {
              // Extract qr if full url was scanned
              let code = decodedText.trim();
              try {
                if (code.includes('?')) {
                  const url = new URL(code);
                  code = url.searchParams.get('start_qr') || url.searchParams.get('qr') || url.searchParams.get('station') || code;
                }
              } catch (_) {}

              await stopCameraScanner();
              setStationQr(code);
            },
            () => {}
          );
        } catch (err) {
          console.warn('Camera failed:', err);
          setError('Camera unavailable. You can enter the station QR code below.');
          setScanningCamera(false);
        }
      }, 100);
    } catch (err) {
      setError('Could not start camera scanner.');
      setScanningCamera(false);
    }
  };

  const stopCameraScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (_) {}
      scannerRef.current = null;
    }
    setScanningCamera(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!stationQr.trim()) {
      setError('Please scan the starting station QR code first.');
      return;
    }

    if (!teamCode.trim()) {
      setError('Please enter your team code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/entry/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationQr: stationQr.trim(),
          passcode: teamCode.trim()
        })
      });

      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (_) {
        throw new Error('Could not connect to backend API. Please restart your dev server with `npm run dev`.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate at this station.');
      }

      localStorage.setItem('thanima_token', data.token);
      onAuthSuccess({
        team: data.team,
        member: data.member,
        currentTask: data.currentTask
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 overflow-y-auto">
      <div className="w-full max-w-sm my-auto rounded-3xl border border-gold/40 bg-card p-6 shadow-2xl">
        <div className="text-center">
          <img
            src="/logo.png"
            alt="Thanima Logo"
            className="h-16 max-h-16 mx-auto object-contain drop-shadow mb-2"
          />
          <p className="text-[11px] tracking-[0.25em] text-gold/90 uppercase font-semibold">Nidhivetta Treasure Hunt</p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/80 p-3 text-xs text-red-200 leading-relaxed">
            {error}
          </div>
        )}

        {/* STEP 1: Scan Station QR (Only if not already scanned or passed in via URL) */}
        {!stationQr ? (
          <div className="mt-6 space-y-4">
            <div className="text-center p-3 rounded-2xl bg-inset border border-white/10">
              <span className="text-2xl block mb-1">📍</span>
              <h3 className="font-serif text-base font-bold text-white">Find Your Starting Station</h3>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">
                Scan the physical QR code placed at your designated station to unlock entry.
              </p>
            </div>

            {scanningCamera ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-2xl border-2 border-dashed border-gold/40 bg-inset p-2">
                  <div id={scannerRegionId} className="w-full min-h-[240px]" />
                </div>
                <button
                  type="button"
                  onClick={stopCameraScanner}
                  className="w-full rounded-xl bg-white/10 py-2.5 text-xs font-semibold text-white/70 hover:bg-white/20 transition"
                >
                  Cancel Scanner
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={startCameraScanner}
                  className="w-full rounded-2xl bg-gold py-4 text-sm font-bold text-bg transition hover:bg-gold/90 active:scale-95 shadow-lg flex items-center justify-center gap-2"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                    <rect x="7" y="7" width="10" height="10" rx="1" />
                  </svg>
                  Scan Station QR Code
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setManualDevMode(!manualDevMode)}
                    className="text-[11px] text-white/40 hover:text-white/70 underline"
                  >
                    {manualDevMode ? 'Hide Manual Code Entry' : 'Testing on PC without Camera?'}
                  </button>
                </div>

                {manualDevMode && (
                  <div className="rounded-xl border border-white/10 bg-inset p-3 space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-white/50 block">
                      Manual Station Code (e.g. THANIMA-START-STATION-1)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="THANIMA-START-STATION-1"
                        onChange={(e) => setStationQr(e.target.value.trim())}
                        className="flex-1 rounded-lg border border-white/20 bg-card px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* STEP 2: Station Scanned! Prompt for Team Code */
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-center">
              <span className="text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Station QR Verified
              </span>
              <p className="text-[11px] text-white/60 mt-0.5">
                Enter your assigned Team Code to enter the hunt:
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gold/90">
                Team Code
              </label>
              <input
                type="text"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value)}
                placeholder="e.g. THANIMA-T1 or T1"
                className="mt-1.5 w-full rounded-xl border border-white/20 bg-inset px-4 py-3.5 text-base text-white uppercase placeholder-white/30 focus:border-gold focus:outline-none font-mono text-center font-bold tracking-widest"
                autoFocus
                required
              />
              <p className="mt-1.5 text-[10px] text-white/50 text-center">
                * Only the 2 teams assigned to this station are permitted to enter.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !teamCode.trim()}
              className="w-full rounded-xl bg-gold py-3.5 text-sm font-bold text-bg transition hover:bg-gold/90 active:scale-95 disabled:opacity-50 shadow-lg"
            >
              {loading ? 'Authenticating...' : 'Enter Treasure Hunt'}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setStationQr('');
                  setError('');
                }}
                className="text-xs text-white/40 hover:text-white/70 underline"
              >
                Scan a different station QR
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
