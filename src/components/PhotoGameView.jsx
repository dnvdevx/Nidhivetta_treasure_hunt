import React, { useState, useEffect } from 'react';

// Helper to compress client-side captured photo to lightweight ~800px JPEG
// Uses URL.createObjectURL instead of loading raw 20MB files into base64 RAM
function compressImage(file) {
  return new Promise((resolve, reject) => {
    let objectUrl = null;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (err) {
      return reject(err);
    }

    const img = new Image();
    img.onload = () => {
      // Immediately release the blob memory URL
      if (objectUrl) URL.revokeObjectURL(objectUrl);

      const maxDim = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.drawImage(img, 0, 0, width, height);

      // Clean up Image object bitmap memory
      img.src = '';

      // 0.65 quality gives clear photos at only ~60-90KB each
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
      resolve(compressedDataUrl);
    };

    img.onerror = (err) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
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

  // Locally persisted approved photo records (strictly never lost once approved)
  const [localApproved, setLocalApproved] = useState(() => {
    try {
      const saved = localStorage.getItem('thanima_approved_photos');
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });

  // Cache of active uploads so uploaded thumbnails appear instantly without flicker
  const [localUploads, setLocalUploads] = useState(() => {
    const uploads = {};
    for (let idx = 0; idx < 3; idx++) {
      try {
        const up = sessionStorage.getItem(`thanima_photo_upload_${idx}`) || localStorage.getItem(`thanima_photo_upload_${idx}`);
        if (up) uploads[idx] = up;
      } catch (_) {}
    }
    return uploads;
  });

  const [uploadingTarget, setUploadingTarget] = useState(null);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  // Automatically lock approved photos into permanent localStorage
  useEffect(() => {
    const serverApproved = (photoState.submissions || []).filter((s) => s.status === 'approved');
    if (serverApproved.length > 0) {
      setLocalApproved((prev) => {
        const next = { ...prev };
        let changed = false;
        serverApproved.forEach((s) => {
          if (!next[s.target_index]) {
            next[s.target_index] = {
              target_index: s.target_index,
              status: 'approved',
              image_url: s.image_url || localUploads[s.target_index] || null
            };
            changed = true;
          } else if (s.image_url && !next[s.target_index].image_url) {
            next[s.target_index].image_url = s.image_url;
            changed = true;
          }
        });
        if (changed) {
          try {
            localStorage.setItem('thanima_approved_photos', JSON.stringify(next));
          } catch (_) {}
          return next;
        }
        return prev;
      });
    }

    // If server reports rejected for a target, clear the discarded local upload
    (photoState.submissions || []).forEach((s) => {
      if (s.status === 'rejected') {
        try {
          sessionStorage.removeItem(`thanima_photo_upload_${s.target_index}`);
          localStorage.removeItem(`thanima_photo_upload_${s.target_index}`);
          setLocalUploads((prev) => {
            const copy = { ...prev };
            delete copy[s.target_index];
            return copy;
          });
        } catch (_) {}
      }
    });
  }, [photoState.submissions]);

  const handleFileCapture = async (targetIndex, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setError('');
    setUploadingTarget(targetIndex);

    try {
      const base64 = await compressImage(file);

      // Save locally immediately so it appears on screen without delay
      try {
        sessionStorage.setItem(`thanima_photo_upload_${targetIndex}`, base64);
        localStorage.setItem(`thanima_photo_upload_${targetIndex}`, base64);
        setLocalUploads((prev) => ({ ...prev, [targetIndex]: base64 }));
      } catch (_) {}

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
  const approvedCount = Math.max(
    photoState.approvedCount || 0,
    Object.keys(localApproved).length,
    (photoState.submissions || []).filter((s) => s.status === 'approved').length
  );
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
          const isApprovedLocally = Boolean(localApproved[tgt.index]);
          const isApproved = isApprovedLocally || submission?.status === 'approved';
          const isRejected = !isApproved && submission?.status === 'rejected';
          const isPending = !isApproved && !isRejected && (submission?.status === 'pending' || Boolean(localUploads[tgt.index]));
          const isCurrentActive = i === approvedCount;

          const displayImageUrl =
            submission?.image_url ||
            localApproved[tgt.index]?.image_url ||
            localUploads[tgt.index] ||
            null;

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

              {/* Mystery Clue Image Card */}
              {tgt.clueImage && (
                <div className="mt-3.5 pl-8">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="font-semibold text-gold">Mystery Clue:</span>
                    <span className="text-[10px] text-white/50">Tap image to enlarge</span>
                  </div>
                  <div
                    onClick={() => setPreviewImage(tgt.clueImage)}
                    className="relative group cursor-pointer overflow-hidden rounded-xl border border-gold/40 bg-black/40 shadow hover:border-gold transition max-w-sm"
                  >
                    <img
                      src={tgt.clueImage}
                      alt="Mystery Clue"
                      className="w-full h-44 object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2 flex items-center justify-between">
                      <span className="text-[10px] text-gold font-medium bg-black/70 px-2 py-0.5 rounded-full border border-gold/30">
                        Clue Detail
                      </span>
                      <span className="text-[10px] text-white/90 bg-black/70 px-2 py-0.5 rounded-full border border-white/20">
                        Tap to zoom
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action / Photo upload button or Thumbnail */}
              <div className="mt-4 pl-8 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {displayImageUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={displayImageUrl}
                        alt={tgt.title}
                        onClick={() => setPreviewImage(displayImageUrl)}
                        className="h-16 w-16 rounded-xl object-cover border border-white/20 cursor-pointer shadow hover:opacity-80"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[8px] text-center text-white/80 rounded-b-xl py-0.5">
                        Your photo
                      </span>
                    </div>
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
                    Find this location and upload a full photo
                  </span>
                )}

                {/* Photo Action Inputs: Camera Snap + Gallery Upload */}
                {!isApproved && (
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Option 1: Live Camera Snap */}
                    <label className="cursor-pointer inline-flex items-center gap-1 rounded-xl bg-gold text-bg px-3.5 py-2 text-xs font-bold hover:bg-gold/90 active:scale-95 transition shadow-md">
                      {uploadingTarget === tgt.index ? (
                        'Uploading...'
                      ) : displayImageUrl ? (
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
                    <label className="cursor-pointer inline-flex items-center gap-1 rounded-xl bg-white/10 border border-white/25 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 active:scale-95 transition">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImage}
              alt="Enlarged"
              className="rounded-2xl max-h-[85vh] w-full object-contain mx-auto shadow-2xl border border-white/10"
            />
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
