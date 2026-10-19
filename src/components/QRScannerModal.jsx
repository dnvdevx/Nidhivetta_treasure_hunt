import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const qrRegionId = 'thanima-qr-reader-region';
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError('');
      setCameraActive(false);

      // Clean up previous instance if any
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (_) {}
      }

      const html5QrCode = new Html5Qrcode(qrRegionId);
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleCodeSubmission(decodedText);
        },
        () => {} // scan failure on frame, ignore
      );

      setCameraActive(true);
    } catch (err) {
      console.warn('Camera initiation failed or permission denied:', err);
      setCameraActive(false);
      setError('Camera access unavailable. You can enter the QR code text manually below!');
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.error('Error stopping QR scanner:', err);
      }
      html5QrCodeRef.current = null;
      setCameraActive(false);
    }
  };

  const handleCodeSubmission = async (code) => {
    if (!code || loading) return;
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('thanima_token');
      const res = await fetch('/api/tasks/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ qrCode: code })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      await stopCamera();
      onScanSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleCodeSubmission(manualCode.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-gold/40 bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gold/20 pb-3">
          <h3 className="font-serif text-xl font-bold text-gold">Scan Station QR</h3>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            aria-label="Close"
            className="text-white/60 hover:text-white p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-500/40 bg-red-950/60 p-2.5 text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Camera stream container */}
        <div className="mt-4 overflow-hidden rounded-2xl border-2 border-dashed border-gold/40 bg-inset p-2 relative">
          <div id={qrRegionId} className="w-full min-h-[240px] flex items-center justify-center text-xs text-white/50">
            {!cameraActive && !loading && (
              <div className="text-center p-4">
                <p>Initializing camera...</p>
                <p className="text-[11px] text-white/40 mt-1">Please allow camera permissions if prompted.</p>
              </div>
            )}
          </div>

          {loading && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-gold text-sm font-bold">
              <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin mb-2" />
              Verifying Code...
            </div>
          )}
        </div>

        {/* Manual code entry */}
        <form onSubmit={handleManualSubmit} className="mt-4 space-y-2">
          <label className="block text-[11px] uppercase tracking-wider text-white/60">
            Or Enter Code Manually
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter Checkpoint Code"
              className="flex-1 rounded-xl border border-white/20 bg-inset px-3 py-2 text-xs text-white placeholder-white/30 focus:border-gold focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !manualCode.trim()}
              className="rounded-xl bg-gold px-4 py-2 text-xs font-bold text-bg hover:bg-gold/90 disabled:opacity-50"
            >
              Verify
            </button>
          </div>
        </form>

        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="mt-4 w-full rounded-xl bg-white/10 py-2.5 text-xs font-semibold text-white/70 hover:bg-white/20 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
