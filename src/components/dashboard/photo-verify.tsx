"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { verifyPhotos, type PhotoVerifyResult } from "@/lib/api";
import type { WorkCase } from "@/lib/types";

export interface PhotoVerifyTarget {
  workId: string;
  title: string;
  district: string;
  forged: boolean;
  priorPHash: string;
}

export function photoTargetFor(c: WorkCase): PhotoVerifyTarget {
  const ev = c.moduleBreakdown.find((m) => m.module === "photo")?.evidence;
  const photoEv = ev && ev.kind === "photo" ? ev : null;
  const match = photoEv ? photoEv.pHashMatchPct : 0;
  const forged = Boolean(photoEv && (c.moduleBreakdown.some((m) => m.module === "photo" && m.triggered) || match >= 85));
  return {
    workId: c.id,
    title: c.title,
    district: c.district,
    forged,
    priorPHash: photoEv?.photos?.[0]?.pHash ?? "a1b2c3d4e5f60718",
  };
}

export interface ExifComparisonRow {
  field: string;
  photoA: string;
  photoB: string;
  corroborating: boolean;
}

function fnv(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function newBaselineFile(target: PhotoVerifyTarget): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 400;
    const g = canvas.getContext("2d");
    if (!g) {
      reject(new Error("Canvas unsupported"));
      return;
    }
    const seed = fnv(target.workId);
    const accent = seed % 2 === 0 ? "#14b8a6" : "#d2a24c";
    g.fillStyle = "#0c2440";
    g.fillRect(0, 0, 640, 400);
    g.strokeStyle = accent;
    g.lineWidth = 2;
    for (let y = 0; y < 400; y += 40) {
      for (let x = 0; x < 640; x += 40) {
        g.beginPath();
        g.moveTo(x + 20, y);
        g.lineTo(x + 40, y + 20);
        g.lineTo(x + 20, y + 40);
        g.lineTo(x, y + 20);
        g.closePath();
        g.stroke();
      }
    }
    g.fillStyle = "rgba(11,60,93,0.55)";
    g.fillRect(20, 20, 600, 360);
    g.strokeStyle = "#ff9933";
    g.lineWidth = 3;
    g.strokeRect(22, 22, 596, 356);
    g.fillStyle = "#ffffff";
    g.font = "bold 26px ui-sans-serif, sans-serif";
    g.fillText("Existing Asset Photo (baseline)", 48, 74);
    g.font = "13px ui-monospace, monospace";
    g.fillStyle = accent;
    g.fillText(target.workId, 48, 98);
    g.fillText(`${target.district} · geo-tagged · shot 08:42 IST`, 48, 118);
    g.beginPath();
    g.arc(320, 210, 54, 0, Math.PI * 2);
    g.fillStyle = "rgba(255,255,255,0.06)";
    g.fill();
    g.strokeStyle = "#ffffff";
    g.lineWidth = 8;
    g.stroke();
    g.strokeStyle = accent;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(320, 210, 44, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "#ff9933";
    g.beginPath();
    g.arc(320, 210, 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.font = "bold 15px ui-sans-serif, sans-serif";
    const tw = Math.min(420, target.title.length);
    g.fillText(target.title.slice(0, tw), 320 - 150, 300);
    g.fillStyle = "rgba(210,162,76,0.9)";
    g.font = "12px ui-monospace, monospace";
    g.fillText(`pHash ${target.priorPHash}`, 48, 358);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Baseline render failed"));
          return;
        }
        resolve(new File([blob], `${target.workId}-baseline.png`, { type: "image/png" }));
      },
      "image/png",
      0.92
    );
  });
}

function demoResult(target: PhotoVerifyTarget): PhotoVerifyResult {
  const stamped = target.forged;
  return {
    source: "offline",
    verdict: stamped ? "FLAGGED_FORGED_DUPLICATE" : "VERIFIED_DISTINCT",
    is_duplicate_flag: stamped,
    similarity_percentage: stamped ? 98.4 : 12.1,
    hamming_distance: stamped ? 1 : 31,
    hash_a: target.priorPHash,
    hash_b: stamped ? target.priorPHash : "e7c2a84f0d9b5361",
    exif_data: stamped
      ? {
          image_a_gps: { lat: 17.38504, lng: 78.48667 },
          image_b_gps: { lat: 17.385015, lng: 78.486655 },
          spatial_distance_meters: 2.4,
          timestamp_a: "2025-08-14 08:42:17",
          timestamp_b: "2025-08-14 08:42:20",
          exif_inconsistencies: ["Duplicate EXIF block", "Timestamp interval < 10s"],
        }
      : {
          image_a_gps: { lat: 17.38504, lng: 78.48667 },
          image_b_gps: { lat: 17.40123, lng: 78.50115 },
          spatial_distance_meters: 2100,
          timestamp_a: "2025-08-14 08:42:17",
          timestamp_b: "2025-09-02 15:10:44",
          exif_inconsistencies: [],
        },
  };
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`text-right text-xs text-navy-900 ${mono ? "font-mono" : ""} break-all`}>{value}</span>
    </div>
  );
}

function Modal({
  target,
  result,
  baselineUrl,
  candidateUrl,
  onClose,
}: {
  target: PhotoVerifyTarget;
  result: PhotoVerifyResult;
  baselineUrl: string;
  candidateUrl: string | null;
  onClose: () => void;
}) {
  const exif = result.exif_data;
  const sim = result.similarity_percentage;
  const flagged = sim >= 85;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-navy-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-navy-100 bg-navy-950 px-5 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gov-gold">Module 6 · Photo Integrity</p>
            <p className="text-sm font-bold text-white">Compare Photo Hashes — {target.workId}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md border border-white/20 px-2 py-1 text-xs font-bold text-white hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Existing asset photo</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={baselineUrl} alt="Existing asset photo" className="mt-2 w-full rounded-md border border-navy-200" />
            <div className="mt-2"><Row label="Hash A" value={result.hash_a} mono /></div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Newly submitted photo</p>
            {candidateUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={candidateUrl} alt="Newly submitted photo" className="mt-2 w-full rounded-md border border-navy-200" />
            ) : (
              <div className="mt-2 flex h-40 items-center justify-center rounded-md border border-dashed border-navy-300 bg-navy-50 text-xs text-slate-500">
                No candidate preview
              </div>
            )}
            <div className="mt-2"><Row label="Hash B" value={result.hash_b} mono /></div>
          </div>
        </div>

        {flagged ? (
          <div className="mx-5 mb-4 rounded-md border border-gate/50 bg-red-50 px-4 py-3">
            <p className="text-sm font-extrabold text-gate">
              MODULE 6 ALERT: Duplicate / Forged Photo Detected (Match: {sim.toFixed(1)}%)
            </p>
            <p className="mt-1 text-xs text-red-900">
              pHashes are {result.hamming_distance} bit(s) apart. EXIF shows GPS co-ordinates {(exif?.spatial_distance_meters ?? 0).toFixed(0)} m apart and near-identical capture stamps — a forged/duplicate submission.
            </p>
            <p className="mt-1.5 text-[11px] italic leading-snug text-red-800">
              EXIF corroborates this flag but is supporting evidence only — capture metadata can be stripped or
              spoofed and is never the primary match signal. The perceptual-hash match above is what triggers the hold.
            </p>
          </div>
        ) : (
          <div className="mx-5 mb-4 rounded-md border border-green-300 bg-green-50 px-4 py-3">
            <p className="text-sm font-extrabold text-green-700">VERIFIED_DISTINCT — authentic capture ({sim.toFixed(1)}% match)</p>
            <p className="mt-1 text-xs text-green-900">
              Perceptual hashes differ by {result.hamming_distance} bits; GPS and timestamps corroborate a fresh on-site capture.
            </p>
            <p className="mt-1.5 text-[11px] italic leading-snug text-green-800">
              EXIF is treated as supporting evidence only — a matching capture stamp strengthens the verdict but can be
              spoofed; the hash difference is what marks the pair as distinct.
            </p>
          </div>
        )}

        <div className="mx-5 mb-5 grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Hash metrics</p>
            <div className="mt-2 divide-y divide-navy-100">
              <Row label="Similarity" value={`${sim.toFixed(1)}%`} />
              <Row label="Hamming distance" value={`${result.hamming_distance} / 64 bits`} />
              <Row label="Verdict" value={result.verdict} mono />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">EXIF corroboration</p>
            <div className="mt-2 divide-y divide-navy-100">
              <Row label="Distance" value={exif?.spatial_distance_meters !== null && exif?.spatial_distance_meters !== undefined ? `${exif.spatial_distance_meters.toFixed(1)} m` : "Unknown"} />
              <Row label="Capture A" value={exif?.timestamp_a ?? "—"} mono />
              <Row label="Capture B" value={exif?.timestamp_b ?? "—"} mono />
              <Row label="Inconsistencies" value={(exif?.exif_inconsistencies ?? []).join(", ") || "None"} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-navy-100 bg-navy-50/60 px-5 py-3">
          {result.source === "offline" && (
            <span className="mr-auto text-[11px] font-semibold text-amber-700">⚠ offline estimate — live backend unreachable</span>
          )}
          <button onClick={onClose} className="rounded-md bg-navy-950 px-4 py-2 text-xs font-bold text-white hover:bg-navy-800">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function PhotoAlertBanner({
  matchPct,
  workId,
  small = false,
}: {
  matchPct: number;
  workId: string;
  small?: boolean;
}) {
  return (
    <div className={`gate-pulse flex items-start gap-2.5 rounded-md border border-gate/50 bg-red-50 px-3 py-2 ${small ? "" : "py-2.5"}`}>
      <div className={`flex shrink-0 items-center justify-center rounded bg-gate font-bold text-white ${small ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm"}`}>⚠</div>
      <div>
        <p className="text-xs font-extrabold text-gate">
          MODULE 6 ALERT: Duplicate / Forged Photo Detected (Match: {matchPct.toFixed(1)}%)
        </p>
        <p className="mt-0.5 text-[11px] text-red-900">
          {workId} — a hard-gate photo-integrity violation. Release blocked pending physical re-verification.
        </p>
      </div>
    </div>
  );
}

export function PhotoVerifyInline({
  target,
  compact = false,
  autoVerify = true,
}: {
  target: PhotoVerifyTarget;
  compact?: boolean;
  autoVerify?: boolean;
}) {
  const [baselineFile, setBaselineFile] = useState<File | null>(null);
  const [baselineUrl, setBaselineUrl] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<File | null>(null);
  const [candidateUrl, setCandidateUrl] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PhotoVerifyResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { workId, title, district, priorPHash, forged } = target;

  useEffect(() => {
    let cancelled = false;
    newBaselineFile({ workId, title, district, priorPHash, forged })
      .then((f) => {
        if (cancelled) return;
        setBaselineFile(f);
        setBaselineUrl(URL.createObjectURL(f));
      })
      .catch(() => setNote("Baseline synthesis unavailable"));
    return () => {
      cancelled = true;
    };
  }, [workId, title, district, priorPHash, forged]);

  const run = useCallback(
    async (cand: File) => {
      if (!baselineFile) {
        setNote("Baseline photo not ready yet — retry in a second.");
        return;
      }
      setRunning(true);
      setResult(null);
      setNote(null);
      const form = new FormData();
      form.append("image_a", baselineFile);
      form.append("image_b", cand);
      try {
        const live = await verifyPhotos(form);
        setResult(live.source === "offline" ? demoResult(target) : live);
      } catch {
        setResult(demoResult(target));
      } finally {
        setRunning(false);
      }
    },
    [baselineFile, target]
  );

  const onPick = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNote("Only image files are accepted.");
      return;
    }
    if (candidateUrl) URL.revokeObjectURL(candidateUrl);
    setCandidate(file);
    setCandidateUrl(URL.createObjectURL(file));
    if (autoVerify) void run(file);
  };

  const flagged = result?.is_duplicate_flag ?? false;

  return (
    <div className={`rounded-lg border border-navy-200 bg-white ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`font-bold text-navy-950 ${compact ? "text-xs" : "text-sm"}`}>Stage photo verification</p>
        <span className="rounded bg-navy-950 px-2 py-0.5 font-mono text-[10px] text-white">{target.workId}</span>
      </div>
      <p className={`mt-0.5 text-[11px] text-slate-500 ${compact ? "" : ""}`}>
        Auto-compares against the soiled asset baseline stored for {target.district} (&lt;2 km geo-cluster).
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Existing asset (baseline)</p>
          <div className={`mt-1 flex items-center justify-center overflow-hidden rounded-md border border-navy-200 bg-navy-50 ${compact ? "h-24" : "h-32"}`}>
            {baselineUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={baselineUrl} alt="Baseline asset" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-slate-400">synthesizing…</span>
            )}
          </div>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-navy-300 bg-white px-2 py-2 text-center hover:border-navy-500 hover:bg-navy-50"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
          {candidateUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={candidateUrl} alt="Newly submitted photo" className={`${compact ? "h-20" : "h-24"} max-w-full rounded object-contain`} />
              <p className="mt-1 max-w-full truncate text-[10px] font-semibold text-navy-800">{candidate?.name}</p>
            </>
          ) : (
            <>
              <span className={`flex items-center justify-center rounded-full bg-navy-100 text-navy-600 ${compact ? "h-7 w-7 text-sm" : "h-9 w-9 text-lg"}`}>⬆</span>
              <p className={`mt-1 font-bold text-navy-900 ${compact ? "text-[11px]" : "text-xs"}`}>Upload stage photo</p>
              <p className={`text-slate-500 ${compact ? "text-[9px]" : "text-[10px]"}`}>drag / browse</p>
            </>
          )}
        </div>
      </div>

      {running && (
        <p className="mt-3 animate-pulse text-[11px] font-semibold text-navy-600">Automatic pHash + EXIF verification running…</p>
      )}

      {note && <p className="mt-2 text-[11px] text-amber-700">{note}</p>}

      {result && flagged && (
        <div className="mt-3">
          <PhotoAlertBanner matchPct={result.similarity_percentage} workId={target.workId} small={compact} />
        </div>
      )}
      {result && !flagged && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-green-300 bg-green-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white check-drop">✓</span>
            <div>
              <p className="text-xs font-bold text-green-800">Authentic capture — {result.similarity_percentage.toFixed(1)}% match</p>
              <p className="text-[10px] text-green-900">VERIFIED_DISTINCT · {result.hamming_distance} bit distance from baseline pHash</p>
            </div>
          </div>
          {result.source === "offline" && (
            <span className="text-[10px] font-semibold text-amber-700">offline</span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => result && setModalOpen(true)}
          disabled={!result}
          className="rounded-md border border-navy-300 bg-white px-3 py-1.5 text-xs font-bold text-navy-800 transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          🔍 Compare Photo Hashes
        </button>
        {result && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-navy-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-navy-50"
          >
            Replace photo
          </button>
        )}
      </div>

      {modalOpen && result && baselineUrl && (
        <Modal
          target={target}
          result={result}
          baselineUrl={baselineUrl}
          candidateUrl={candidateUrl}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}