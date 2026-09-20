"use client";

import type { ModuleBreakdown } from "@/lib/types";
import { Card } from "@/components/ui";
import { tokenSortRatio } from "@/lib/similarity";

/* Stylized illustrative map: no real map API needed */
function StylizedMap({ mapX, mapY }: { mapX: number; mapY: number }) {
  return (
    <svg viewBox="0 0 240 160" className="h-auto w-full max-w-[340px] rounded-md border border-navy-200 bg-[#e8eef7]" role="img" aria-label="Stylised illustration of two work sites on a map">
      <defs>
        <pattern id="roads" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M 8 0 L 0 8" stroke="#c6d3e6" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="240" height="160" fill="#e8eef7" />
      <rect width="240" height="160" fill="url(#roads)" opacity="0.5" />
      <path d="M0 120 L90 100 L150 118 L240 96" fill="none" stroke="#9bb3d2" strokeWidth="2" strokeDasharray="4 4" />
      <rect x={208} y={10} width={26} height={14} rx={2} fill="#dce8f5" stroke="#8fb0d9" />
      <text x={221} y={20} fontSize={7} textAnchor="middle" fill="#143560">
        N
      </text>
      <svg x={218} y={18}>
        <path d="M0 0 L6 0 L3 -6 Z" fill="#143560" />
      </svg>
      {/* current project */}
      <g transform={`translate(${60} ${105})`}>
        <circle r="9" fill="#0c2440" opacity="0.15" />
        <path d="M0 -6 L5 4 L-5 4 Z" fill="#0c2440" />
        <circle r="2.5" fill="#2e6fb0" />
      </g>
      <text x={60} y={128} fontSize={8} fontWeight={600} fill="#0c2440" textAnchor="middle">
        This work
      </text>
      {/* twin project */}
      <g transform={`translate(${mapX} ${mapY})`}>
        <circle r="9" fill="#b45309" opacity="0.15" />
        <path d="M0 -6 L5 4 L-5 4 Z" fill="#b45309" />
        <circle r="2.5" fill="#d97706" />
      </g>
      <text x={mapX} y={mapY + 16} fontSize={8} fontWeight={600} fill="#92400e" textAnchor="middle">
        Twin project
      </text>
      {/* distance line */}
      <line x1={60} y1={105} x2={mapX} y2={mapY} stroke="#b42318" strokeWidth="1.5" strokeDasharray="5 3" />
    </svg>
  );
}

function PinGlyph({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex flex-col gap-1 overflow-hidden rounded-md border border-navy-200 bg-white">
      <div className="mx-3 mt-3 flex items-center justify-center gap-2 rounded-md border border-navy-200 bg-navy-50 px-4 py-6">
        <span className="text-2xl">▦</span>
        <span className="text-2xl">⛰</span>
      </div>
      <div className="px-3 pb-2 text-center">
        <div className="text-xs font-semibold text-navy-900">{label}</div>
        <div className="mt-1 font-mono text-[10px] text-slate-500">
          pHash <span style={{ backgroundColor: color }} className="rounded px-1 py-0.5 font-bold text-white">≡</span>{" "}
          <span className="tabular-nums">a3f81c…d7e4</span>
        </div>
      </div>
    </div>
  );
}

export function EvidencePanel({ module, liveTitle }: { module: ModuleBreakdown; liveTitle?: string }) {
  const ev = module.evidence;
  if (!ev) return null;
  // Similarity is always derived from the two current descriptions at
  // render time — editing a title recomputes it with no reload.
  const liveSim =
    ev.kind === "duplicate" && liveTitle ? tokenSortRatio(liveTitle, ev.twinTitle) : null;

  return (
    <Card className="border-l-4 border-l-navy-700 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-navy-700">Evidence · {module.module === "duplicate" ? "Duplicate-Works" : module.module === "cost" ? "Cost & Delay" : module.module === "compliance" ? "Compliance" : module.module === "photo" ? "Photo Verification" : module.module === "predictive" ? "Predictive Early-Warning" : "Payment or Analysis"}</div>
          <div className="mt-0.5 text-xs text-slate-500">{module.description}</div>
        </div>
        <span className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700">
          flagged · sub-score {module.subScore}/100
        </span>
      </div>

      {ev.kind === "duplicate" && (
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="flex flex-col justify-center gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Twin work</div>
              <div className="text-sm font-semibold text-navy-950">{ev.twinTitle}</div>
              <div className="font-mono text-xs text-slate-500">{ev.twinId}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-navy-200 bg-navy-50 p-3">
                <div className="text-[11px] text-slate-500">Overlap distance</div>
                <div className="text-xl font-bold tabular-nums text-navy-900">{ev.distanceMeters} m</div>
              </div>
              <div className="rounded-md border border-gate/30 bg-red-50 p-3">
                <div className="text-[11px] text-slate-500">
                  Text similarity{liveSim !== null ? " · recomputed live" : ""}
                </div>
                <div className="text-xl font-bold tabular-nums text-gate">{liveSim ?? ev.textSimilarityPct}%</div>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              The two proposals sit within identical catchment and their descriptive text overlaps{" "}
              {liveSim ?? ev.textSimilarityPct}% after stemming. Recommended action in guidelines ADR-11: merge
              or drop the duplicate.
            </p>
          </div>
          <StylizedMap mapX={ev.mapX} mapY={ev.mapY} />
        </div>
      )}

      {ev.kind === "cost" && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex-1">
            {ev.baselineSource === "manual" ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-xs leading-relaxed text-amber-900">
                <span className="font-bold">Manual review pending.</span>{" "}
                No cost baseline is yet populated for this category in the district or state cohort,
                so automated cost comparison is paused and the estimate is referred for a manual
                engineering-cost review before any payment release.
              </div>
            ) : (
              <>
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="font-semibold text-navy-800">{ev.categoryLabel}</span>
                  <span className="font-mono text-slate-500">peer baseline</span>
                </div>
                <svg viewBox="0 0 320 120" className="h-auto w-full">
                  <line x1={20} y1={100} x2={300} y2={100} stroke="#aab7ca" strokeWidth="1" />
                  <rect x={70} y={55} width={8} height={45} fill="#9fb6d6" />
                  <rect x={78} y={52} width={8} height={48} fill="#b9ceec" />
                  <rect x={86} y={50} width={8} height={50} fill="#dce8f5" />
                  <text x={88} y={110} textAnchor="middle" fontSize={7} fill="#64748b">peer range ↓</text>
                  <rect x={150} y={26} width={16} height={74} fill="#dc2626" />
                  <text x={158} y={116} textAnchor="middle" fontSize={8} fontWeight={700} fill="#dc2626">this work</text>
                  <line x1={70} y1={44} x2={170} y2={44} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
                  <text x={72} y={40} fontSize={7} fill="#b45309">peer mean ₹{ev.peerMeanLakh} L</text>
                </svg>
              </>
            )}
          </div>
          <div className="w-full max-w-[240px] space-y-2 rounded-md border border-navy-200 bg-navy-50 p-3">
            <Row label="Sanctioned" value={`₹${ev.sanctionedLakh} L`} strong />
            {ev.expectedLakh !== undefined && (
              <Row label="Model-expected" value={`₹${ev.expectedLakh} L`} />
            )}
            {ev.residualPct !== undefined ? (
              <Row
                label="Cost residual"
                value={`${ev.residualPct > 0 ? "+" : ""}${ev.residualPct}%`}
                alert={module.triggered}
              />
            ) : (
              <Row label="Robust z-score" value={`${ev.zScore > 0 ? "+" : ""}${ev.zScore}`} alert={ev.zScore > 2} />
            )}
            <Row label="Peer mean" value={`₹${ev.peerMeanLakh} L`} />
            <Row label="Peer band" value={`₹${ev.peerLowLakh}–₹${ev.peerHighLakh} L`} />
            <Row
              label="Baseline source"
              value={
                ev.baselineSource === "terrain+district"
                  ? "district + category + terrain cohort"
                  : ev.baselineSource === "district"
                  ? "district + category cohort"
                  : ev.baselineSource === "state"
                  ? "state-level (category-wide) cohort"
                  : "manual review"
              }
            />
            {ev.baselineNote && <p className="pt-1 text-[10px] leading-snug text-slate-500">{ev.baselineNote}</p>}
            {ev.model && (
              <p className="pt-1 text-[10px] leading-snug text-slate-500">
                Scored by trained regressor <span className="font-mono">{ev.model}</span>
                {ev.shapTop && ev.shapTop.length > 0 && (
                  <>
                    {" "}· top drivers:{" "}
                    {ev.shapTop
                      .map((s) => `${s.feature} (${s.contribution > 0 ? "+" : ""}${s.contribution})`)
                      .join(", ")}
                  </>
                )}
                .
              </p>
            )}
          </div>
        </div>
      )}

      {ev.kind === "compliance" && (
        <div>
          <div className="mb-3 overflow-hidden rounded-md border border-navy-200">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-navy-200 bg-navy-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <span>{ev.field}</span>
              <span aria-hidden>→</span>
              <span>Required</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3">
              <div className="rounded-md border border-gate bg-red-50 px-3 py-2 text-sm font-bold text-gate">
                {ev.actual}
              </div>
              <span className="text-lg text-red-600" aria-hidden>✗</span>
              <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-bold text-green-800">
                {ev.required}
              </div>
            </div>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <span className="font-bold">{ev.ruleRef}.</span> {ev.clauseText}
          </div>
        </div>
      )}

      {ev.kind === "photo" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex items-end justify-center gap-3">
            {ev.photos.map((p) => (
              <div key={p.label} className="w-1/2">
                <PinGlyph label={p.label} color={p.color} />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="rounded-md border border-gate/30 bg-red-50 px-3 py-2 text-sm">
              <span className="font-bold text-gate">Perceptual hash match: {ev.pHashMatchPct}%</span>
              <span className="ml-2 text-xs text-slate-500">— near-identical photograph.</span>
            </div>
            <div className="overflow-hidden rounded-md border border-navy-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-navy-50 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-2 py-1.5">Metadata field</th>
                    <th className="px-2 py-1.5">Photo A</th>
                    <th className="px-2 py-1.5">Photo B</th>
                    <th className="px-2 py-1.5">Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {ev.exif.map((r) => (
                    <tr key={r.field}>
                      <td className="px-2 py-1.5 font-semibold text-navy-800">{r.field}</td>
                      <td className="px-2 py-1.5 tabular-nums text-slate-600">{r.photoA}</td>
                      <td className="px-2 py-1.5 tabular-nums text-slate-600">{r.photoB}</td>
                      <td className="px-2 py-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            r.corroborating ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {r.corroborating ? "corroborating ↗" : "neutral"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-600">
              pHash and EXIF are <span className="font-semibold">corroborating — not conclusive —</span> signals.
              A field verification is triggered before the hold can be lifted.
            </p>
          </div>
        </div>
      )}

      {ev.kind === "predictive" && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex shrink-0 items-center justify-center">
            <svg viewBox="0 0 120 120" className="h-32 w-32">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e3e9f2" strokeWidth="12" />
              <path
                d="M60 10 A50 50 0 0 1 60 110"
                transform="rotate(223 60 60)"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <text x="60" y="58" textAnchor="middle" fontSize="20" fontWeight="800" fill="#92400e">
                62%
              </text>
              <text x="60" y="74" textAnchor="middle" fontSize="8" fontWeight="600" fill="#64748b">
                likely to stall
              </text>
            </svg>
          </div>
          <div className="flex-1 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Contributing early-stage factors</div>
            {ev.factors.map((f, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-xs text-navy-900">
                <span className="mt-0.5 font-mono text-[10px] font-bold text-navy-500">F{i + 1}</span>
                <span>{f}</span>
              </div>
            ))}
            <p className="pt-1 text-xs text-slate-600">
              Modelled probability, not a determination. Used to prioritise supervisory visits; no monetary hold is implied.
            </p>
          </div>
        </div>
      )}

      {ev.kind === "pfms" && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={`rounded-md border p-3 ${ev.fundRedirectionAlert ? "border-red-300 bg-red-50" : "border-navy-200 bg-navy-50"}`}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Bank Account Binding</div>
              <div className={`mt-1 text-base font-bold ${ev.fundRedirectionAlert ? "text-red-700" : "text-green-700"}`}>
                {ev.accountMatch ? "✓ Stage-1 Account Match" : "⚠ UNMATCHED ACCOUNT"}
              </div>
            </div>
            <div className={`rounded-md border p-3 ${ev.vendorSimilarityPct < 85 ? "border-amber-300 bg-amber-50" : "border-navy-200 bg-navy-50"}`}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">PFMS Vendor Match</div>
              <div className="mt-1 text-base font-bold text-navy-900">
                {ev.vendorSimilarityPct.toFixed(1)}% similarity
              </div>
              {ev.vendorMatchedName && (
                <div className="mt-0.5 truncate text-[11px] text-slate-600">{ev.vendorMatchedName}</div>
              )}
            </div>
            <div className="rounded-md border border-navy-200 bg-navy-50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Disbursement Stage</div>
              <div className="mt-1 text-base font-bold text-navy-900">Stage #{ev.stageNumber}</div>
            </div>
          </div>
          <div className="rounded-md border border-navy-200 bg-white p-3 text-xs leading-relaxed text-navy-900">
            <div className="font-semibold text-slate-700">PFMS Audit Summary:</div>
            <p className="mt-1 text-slate-600">{ev.detail}</p>
          </div>
          <p className="text-[10px] italic leading-snug text-slate-500">
            Matched against the illustrative vendor/agency directory bundled with this demo — not a live PFMS lookup.
          </p>
        </div>
      )}

      {ev.kind === "trend" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-navy-200 bg-navy-50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">This work released</div>
            <div className="mt-1 text-base font-bold tabular-nums text-navy-900">{ev.caseReleasePct}%</div>
          </div>
          <div className="rounded-md border border-navy-200 bg-navy-50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Comparator pace</div>
            <div className="mt-1 text-base font-bold tabular-nums text-navy-900">{ev.peerReleasePct}%</div>
          </div>
          <div className="rounded-md border border-navy-200 bg-navy-50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Comparison basis</div>
            <div className="mt-1 text-xs font-semibold leading-snug text-navy-900">{ev.basis}</div>
            {ev.longitudinal && (
              <div className="mt-0.5 text-[10px] italic text-slate-500">multi-year longitudinal series</div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function Row({ label, value, strong, alert }: { label: string; value: string; strong?: boolean; alert?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-xs text-slate-500">{label}</span>
      <span
        className={`tabular-nums ${strong ? "font-bold text-navy-950" : "font-semibold"} ${
          alert ? "font-bold text-gate" : "text-navy-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}