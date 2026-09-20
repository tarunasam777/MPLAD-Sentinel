"use client";

import { useRef, useState } from "react";
import { Shell } from "@/components/shell";
import { verifyPhotos, type PhotoVerifyResult } from "@/lib/api";
import { Card, HelpNote, SectionTitle } from "@/components/ui";

type Slot = "a" | "b";

interface Band {
  bar: string;
  text: string;
  gauge: string;
  label: string;
}

const BANDS: Record<"green" | "yellow" | "red", Band> = {
  green: {
    bar: "bg-teal-500",
    text: "text-teal-700",
    gauge: "#0d9488",
    label: "Green · no visual match",
  },
  yellow: {
    bar: "bg-amber-500",
    text: "text-amber-600",
    gauge: "#f59e0b",
    label: "Yellow · borderline watch",
  },
  red: {
    bar: "bg-gate",
    text: "text-gate",
    gauge: "#b42318",
    label: "Red · likely duplicate",
  },
};

function simBand(sim: number): Band {
  if (sim >= 85) return BANDS.red;
  if (sim >= 50) return BANDS.yellow;
  return BANDS.green;
}

function SimGauge({ sim, color, size = 168 }: { sim: number; color: string; size?: number }) {
  const stroke = 16;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, sim)) / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e3e9f2" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-4xl font-extrabold tabular-nums text-navy-950">{Math.round(sim)}%</span>
        <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
          match
        </span>
      </div>
    </div>
  );
}

function UploadBox({
  slot,
  title,
  subtitle,
  preview,
  fileName,
  dragging,
  inputRef,
  onFile,
  onDragging,
  onDrop,
}: {
  slot: Slot;
  title: string;
  subtitle: string;
  preview: string | null;
  fileName: string | null;
  dragging: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File | null) => void;
  onDragging: (d: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
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
      onDragOver={(e) => {
        e.preventDefault();
        onDragging(true);
      }}
      onDragLeave={() => onDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDragging(false);
        onDrop(e);
      }}
      className={`flex min-h-[240px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition ${
        dragging
          ? "border-teal-500 bg-teal-50"
          : "border-navy-300 bg-white hover:border-navy-500 hover:bg-navy-50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <div className="mb-2 rounded bg-white/80 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-navy-500">
        Box {slot.toUpperCase()} · {title}
      </div>
      {preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={title} className="max-h-44 max-w-full rounded-md border border-navy-200 object-contain shadow-sm" />
          <div className="mt-2 max-w-full truncate text-xs font-semibold text-navy-800">{fileName}</div>
          <div className="mt-0.5 text-[10px] text-slate-500">Click or drag a new image to replace</div>
        </>
      ) : (
        <>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 text-lg text-navy-600">
            ⬆
          </div>
          <div className="mt-2 text-sm font-bold text-navy-900">{subtitle}</div>
          <div className="mt-1 text-xs text-slate-500">
            Drag &amp; drop, or click to browse
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`text-right text-xs text-navy-900 ${mono ? "font-mono" : ""} break-all`}>{value}</span>
    </div>
  );
}

export default function VerifyPhotoPage() {
  const [imageA, setImageA] = useState<File | null>(null);
  const [imageB, setImageB] = useState<File | null>(null);
  const [previewA, setPreviewA] = useState<string | null>(null);
  const [previewB, setPreviewB] = useState<string | null>(null);
  const [dragging, setDragging] = useState<Slot | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PhotoVerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputARef = useRef<HTMLInputElement>(null);
  const inputBRef = useRef<HTMLInputElement>(null);

  const replaceFile = (slot: Slot, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are accepted (JPEG, PNG, WebP…).");
      return;
    }
    const prev = slot === "a" ? previewA : previewB;
    if (prev) URL.revokeObjectURL(prev);
    const url = URL.createObjectURL(file);
    if (slot === "a") {
      setImageA(file);
      setPreviewA(url);
    } else {
      setImageB(file);
      setPreviewB(url);
    }
    setResult(null);
    setError(null);
  };

  const handleDrop = (slot: Slot) => (e: React.DragEvent) => {
    replaceFile(slot, e.dataTransfer.files?.[0] ?? null);
  };

  const run = async () => {
    if (!imageA || !imageB) return;
    setRunning(true);
    setError(null);
    const form = new FormData();
    form.append("image_a", imageA);
    form.append("image_b", imageB);
    try {
      setResult(await verifyPhotos(form));
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Photo verification failed.");
    } finally {
      setRunning(false);
    }
  };

  const canRun = Boolean(imageA && imageB) && !running;
  const sim = result?.similarity_percentage ?? 0;
  const band = result ? simBand(sim) : null;
  const hardGate = result !== null && sim >= 85;
  const exif = result?.exif_data;

  return (
    <Shell active="home">
      <div className="mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-500">
          Photo verification playground · Module 11 photo-integrity
        </div>
        <h1 className="mt-1 text-2xl font-extrabold text-navy-950">Live pHash Verification</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Upload the <b>existing site asset photo</b> and a <b>newly submitted milestone photo</b>. The backend
          computes a perceptual hash (pHash) of each image, compares them bit-by-bit, and cross-checks embedded
          EXIF GPS + timestamps to decide whether the submission is a genuine distinct capture or a forged duplicate.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <UploadBox
          slot="a"
          title="Target image"
          subtitle="Existing site asset photo"
          preview={previewA}
          fileName={imageA?.name ?? null}
          dragging={dragging === "a"}
          inputRef={inputARef}
          onFile={(f) => replaceFile("a", f)}
          onDragging={(d) => setDragging(d ? "a" : null)}
          onDrop={handleDrop("a")}
        />
        <UploadBox
          slot="b"
          title="Candidate image"
          subtitle="Newly submitted milestone photo"
          preview={previewB}
          fileName={imageB?.name ?? null}
          dragging={dragging === "b"}
          inputRef={inputBRef}
          onFile={(f) => replaceFile("b", f)}
          onDragging={(d) => setDragging(d ? "b" : null)}
          onDrop={handleDrop("b")}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={!canRun}
          className="inline-flex items-center gap-2 rounded-md bg-teal-500 px-5 py-2.5 text-sm font-bold text-navy-950 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? "Verifying…" : "▶ Run Real-time pHash Verification"}
        </button>
        <span className="text-xs text-slate-500">
          pHash (64-bit) · EXIF GPS + timestamp · Haversine distance
        </span>
      </div>

      {error && (
        <div className="mt-5 rounded-md border border-gate/40 bg-red-50 px-4 py-3 text-sm font-semibold text-gate">
          Verification failed: {error}
        </div>
      )}

      {result && band && (
        <Card className="mt-6 overflow-hidden">
          <div className="flex flex-wrap items-center gap-6 border-b border-navy-100 bg-navy-50/60 px-5 py-4">
            <SimGauge sim={sim} color={band.gauge} />
            <div className="min-w-[220px] flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Similarity match bar
                </span>
                <span className={`text-xs font-bold ${band.text}`}>{band.label}</span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-navy-100">
                <div
                  className={`h-full rounded-full ${band.bar} transition-all duration-1000`}
                  style={{ width: `${Math.min(100, Math.max(0, sim))}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] font-semibold text-slate-400">
                <span>0% — distinct</span>
                <span>50% — borderline</span>
                <span>85%+ — duplicate gate</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {result.verdict === "FLAGGED_FORGED_DUPLICATE" ? (
                  <span className="rounded bg-gate px-2.5 py-1 text-xs font-bold text-white">
                    FLAGGED_FORGED_DUPLICATE
                  </span>
                ) : (
                  <span className="rounded bg-green-600 px-2.5 py-1 text-xs font-bold text-white">
                    VERIFIED_DISTINCT
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  {result.is_duplicate_flag
                    ? "pHash gate condition met on hamming distance / similarity."
                    : "No duplicate signals from perceptual hash."}
                </span>
                {result.source === "offline" && (
                  <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                    ⚠ offline estimate — live backend unreachable
                  </span>
                )}
              </div>
            </div>
          </div>

          {hardGate && (
            <div className="gate-pulse border-b border-gate bg-red-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gate text-lg font-bold text-white">
                  ⚠
                </div>
                <div>
                  <div className="text-sm font-extrabold text-gate">
                    Module 6 Hard Gate Triggered: Duplicate / Forged Photo Detected
                  </div>
                  <p className="mt-1 text-xs text-red-900">
                    Similarity is ≥ 85% (Hamming distance ≤ 10). This submission is blocked from release pending
                    physical re-verification — treat it as a high-confidence photo-integrity violation.
                  </p>
                  <p className="mt-1.5 text-[11px] italic leading-snug text-red-800">
                    EXIF is supporting evidence only — capture metadata can be stripped or spoofed and never drives
                    the verdict; the perceptual-hash match is the deciding signal.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-5 px-5 py-4 md:grid-cols-2">
            <div>
              <SectionTitle title="pHash breakdown" subtitle="64-bit perceptual hash fingerprints" />
              <div className="mt-2 divide-y divide-navy-100">
                <Row label="Hash A · target" value={result.hash_a} mono />
                <Row label="Hash B · candidate" value={result.hash_b} mono />
                <Row label="Hamming distance" value={`${result.hamming_distance} / 64 bits`} />
                <Row label="Similarity" value={`${result.similarity_percentage.toFixed(1)}%`} />
              </div>
            </div>

            <div>
              <SectionTitle title="EXIF location comparison" subtitle="Embedded GPS + capture timestamp" />
              <div className="mt-2 divide-y divide-navy-100">
                <Row
                  label="Image A GPS"
                  value={
                    exif?.image_a_gps
                      ? `${exif.image_a_gps.lat.toFixed(5)}, ${exif.image_a_gps.lng.toFixed(5)}`
                      : "No GPS data embedded"
                  }
                />
                <Row
                  label="Image B GPS"
                  value={
                    exif?.image_b_gps
                      ? `${exif.image_b_gps.lat.toFixed(5)}, ${exif.image_b_gps.lng.toFixed(5)}`
                      : "No GPS data embedded"
                  }
                />
                <Row
                  label="Capture distance"
                  value={
                    exif?.spatial_distance_meters !== null && exif?.spatial_distance_meters !== undefined
                      ? exif.spatial_distance_meters < 1000
                        ? `${exif.spatial_distance_meters.toFixed(1)} m`
                        : `${(exif.spatial_distance_meters / 1000).toFixed(2)} km`
                      : "Unknown"
                  }
                />
                <Row label="Image A timestamp" value={exif?.timestamp_a ?? "No timestamp"} />
                <Row label="Image B timestamp" value={exif?.timestamp_b ?? "No timestamp"} />
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="mt-6">
        <HelpNote>
          Image-hash and EXIF checks run server-side via FastAPI. Note that WhatsApp / social messengers strip
          EXIF metadata entirely — a missing GPS field is <b>not</b> itself proof of tampering, just a missing
          corroboration channel. Identical or near-identical pHashes across two distinct works always hard-fail.
        </HelpNote>
      </div>
    </Shell>
  );
}