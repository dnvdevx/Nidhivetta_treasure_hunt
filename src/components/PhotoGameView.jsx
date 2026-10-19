import React, { useState } from 'react';

// Helper to compress client-side captured photo to ~800px JPEG to keep it snappy and light
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 850;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

export default function PhotoGameView({ task, onTaskCompleted, onSyncState }) {
  const photoState = task?.photoGameState || {
    targets: [],
    submissions: [],
    approvedCount: 0,
    requiredCount: 3,
    allTargetsCount: 3
  };

  const [uploadingTarget, setUploadingTarget] = useState(null);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  const handleFileCapture = async (targetIndex, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setError('');
    setUploadingTarget(targetIndex);

    try {
      const base64 = await compressImage(file);
      const token = localStorage.getItem('thanima_token');

      const res = await fetch('/api/photo-game/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          targetIndex,
          imageUrl: base64
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit photo');

      if (onSyncState) onSyncState();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingTarget(null);
    }
  };

  const targets = photoState.targets || [];
  const approvedCount = photoState.approvedCount || 0;
  const isAllApproved = approvedCount >= 3;

  return (
    <div className="space-y-4">
      {/* Header status */}
      <div className="rounded-2xl border border-gold/30 bg-inset/90 p-4 shadow-lg space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-serif text-base font-bold text-gold">Photo Game</h4>
            <p className="text-[11px] text-white/60">
              Identify & photograph 3 campus locations
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-white uppercase tracking-wider block">Approved</span>
            <span className="text-base font-bold text-gold">
              {approvedCount} / 3
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 overflow-hidden rounded-full bg-card">
          <div
            className="h-full rounded-full bg-gold transition-all duration-500 shadow-sm"
            style={{ width: `${Math.min((approvedCount / 3) * 100, 100)}%` }}
          />
        </div>

        {/* User's Exact Authentic Quote */}
        <p className="text-xs text-white/80 leading-relaxed italic border-t border-white/10 pt-2 font-serif">
          "Only a small piece of the picture is revealed, but the full picture is waiting to be found! Study the given image carefully, explore the campus, and identify the exact location shown. Once you find it, take a photograph of the complete location and upload it."
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/60 p-2.5 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Target Items List - Displayed one after the other */}
      <div className="space-y-3">
        {targets.map((tgt, i) => {
          const submission = (photoState.submissions || []).find((s) => s.target_index === tgt.index);
          const isPending = submission?.status === 'pending';
          const isApproved = submission?.status === 'approved';
          const isRejected = submission?.status === 'rejected';
          const isCurrentActive = i === approvedCount;

          return (
            <div
              key={tgt.index}
              className={`rounded-2xl border p-4 transition shadow-md ${
                isApproved
                  ? 'border-emerald-500/50 bg-emerald-950/30'
                  : isCurrentActive
                  ? 'border-gold bg-card ring-2 ring-gold/20'
                  : isPending
                  ? 'border-amber-500/40 bg-amber-950/20'
                  : isRejected
                  ? 'border-red-500/40 bg-red-950/20'
                  : 'border-white/10 bg-inset/70'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      isApproved ? 'bg-emerald-500 text-bg' : 'bg-gold/20 text-gold'
                    }`}>
                      {isApproved ? (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <h5 className="font-serif font-bold text-sm text-white">
                      {tgt.title}
                    </h5>
                  </div>
                  <p className="text-xs text-white/70 mt-1 pl-8 leading-relaxed">
                    {tgt.description}
                  </p>
                </div>

                {/* Status pill */}
                {isApproved && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 whitespace-nowrap">
                    Approved
                  </span>
                )}
                {isPending && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30 whitespace-nowrap animate-pulse">
                    Under Review
                  </span>
                )}
                {isRejected && (
                  <span className="text-[10px] bg-red-500/20 text-red-300 font-bold px-2.5 py-0.5 rounded-full border border-red-500/30 whitespace-nowrap">
                    Retake Photo
                  </span>
                )}
              </div>

              {/* Action / Photo upload button or Thumbnail */}
              <div className="mt-3 pl-8 flex items-center justify-between">
                {submission?.image_url ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={submission.image_url}
                      alt={tgt.title}
                      onClick={() => setPreviewImage(submission.image_url)}
                      className="h-14 w-14 rounded-xl object-cover border border-white/20 cursor-pointer shadow hover:opacity-80"
                    />
                    <div className="text-[11px] text-white/60">
                      {isApproved
                        ? 'Coordinator verified! Location cleared.'
                        : isPending
                        ? 'Coordinator is reviewing your photo...'
                        : 'Coordinator requested a retake.'}
                    </div>
                  </div>
                ) : (
                  <span className="text-[11px] text-white/40 italic">
                    Take a clear full photo of this location
                  </span>
                )}

                {/* Photo Action Inputs: Camera Snap + Gallery Upload */}
                {!isApproved && (
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Option 1: Live Camera Snap */}
                    <label className="cursor-pointer inline-flex items-center gap-1 rounded-xl bg-gold text-bg px-3 py-1.5 text-xs font-bold hover:bg-gold/90 active:scale-95 transition shadow-md">
                      {uploadingTarget === tgt.index ? (
                        'Uploading...'
                      ) : submission ? (
                        'Retake'
                      ) : (
                        'Camera'
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFileCapture(tgt.index, e)}
                        disabled={uploadingTarget !== null}
                        className="hidden"
                      />
                    </label>

                    {/* Option 2: Upload from Device / Gallery */}
                    <label className="cursor-pointer inline-flex items-center gap-1 rounded-xl bg-white/10 border border-white/25 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/20 active:scale-95 transition">
                      {uploadingTarget === tgt.index ? '...' : 'Gallery'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileCapture(tgt.index, e)}
                        disabled={uploadingTarget !== null}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Next locked target indicator if still in progress */}
      {!isAllApproved && approvedCount < 2 && targets.length < 3 && (
        <div className="rounded-xl border border-dashed border-white/15 bg-card/40 p-3 text-center text-xs text-white/50">
          Next campus location will unlock as soon as the current photo is approved.
        </div>
      )}

      {/* Triumph Notice if all 3 approved */}
      {isAllApproved && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/70 p-3.5 text-center text-xs text-emerald-200 font-bold leading-relaxed animate-pulse">
          All 3 campus location photos approved! Trial completed!
        </div>
      )}

      {/* Full image preview popup */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <div className="relative max-w-sm">
            <img src={previewImage} alt="Enlarged" className="rounded-2xl max-h-[80vh] shadow-2xl" />
            <button
              onClick={() => setPreviewImage(null)}
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
    </div>
  );
}
