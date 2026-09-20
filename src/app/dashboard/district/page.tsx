"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { useApp } from "@/store/AppStore";
import { districts } from "@/lib/data";
import { moduleMeta, inr, scoreBand } from "@/lib/format";
import type { ModuleKind, WorkCase } from "@/lib/types";
import { Card, HelpNote, Pill, SelectInput, TextInput } from "@/components/ui";
import { GateBadge, ScoreBar } from "@/components/dashboard/risk";
import { StatusPill } from "@/components/dashboard/stepper";
import { PhotoAlertBanner, PhotoVerifyInline, photoTargetFor } from "@/components/dashboard/photo-verify";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { ModeBanner } from "@/components/dashboard/ModeBanner";
import { AuthBanner } from "@/components/dashboard/AuthBanner";
import { InspectorPanel } from "@/components/modules/InspectorPanel";

type Filter = "all" | "actionable" | "gate" | "risk";

const chips: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "actionable", label: "Actionable holds" },
  { key: "gate", label: "Critical gate hold" },
  { key: "risk", label: "High cost variance" },
];

type SortKey = "score" | "amount" | "id";

const VENDOR_NAMES = [
  "Shreyas Infra Pvt Ltd",
  "Telangana Civil Builders",
  "N.A. Construction Co.",
  "Sri Sai Engineering",
  "Deccan Roads & Bridges",
  "GreenGrid Energy LLP",
];

function pfmsRow(c: WorkCase) {
  const vendor = VENDOR_NAMES[Number(c.id.replace(/\D/g, "")) % VENDOR_NAMES.length];
  const ev = c.moduleBreakdown.find((m) => m.evidence && m.evidence.kind === "pfms");
  const pf = ev && ev.evidence && ev.evidence.kind === "pfms" ? ev.evidence : null;
  const flagged = Boolean(pf?.fundRedirectionAlert) || (pf?.vendorSimilarityPct ?? 0) >= 85;
  const matched = pf?.accountMatch ?? c.status !== "hold_active";
  return { vendor, flagged, matched };
}

export default function DistrictDashboardPage() {
  const { state, api } = useApp();
  const [district, setDistrict] = useState("All districts");
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [asc, setAsc] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [syncingScores, setSyncingScores] = useState(false);

  const selected = selectedId ? state.cases.find((c) => c.id === selectedId) ?? null : null;

  const syncScores = async () => {
    setSyncingScores(true);
    try {
      await api.syncScores();
    } catch {
      /* lastAction carries the unreachable-backend message */
    } finally {
      setSyncingScores(false);
    }
  };

  const quick = (c: WorkCase, decision: "approve" | "inspect" | "escalate") => (e: React.MouseEvent) => {
    e.stopPropagation();
    const label = decision === "approve" ? "Approve & release" : decision === "escalate" ? "Escalate" : "Inspect";
    api.decideCase(c.id, decision, `Quick “${label}” from DM working queue.`);
  };

  const rows = useMemo(() => {
    let list = state.cases;
    if (district !== "All districts") list = list.filter((c) => c.district === district);
    if (filter === "actionable") list = list.filter((c) => c.status === "hold_active");
    if (filter === "gate") list = list.filter((c) => c.gate.fired && (c.status === "hold_active" || c.status === "override_approved"));
    if (filter === "risk") list = list.filter((c) => scoreBand(c.compositeScore) === "high");
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(needle) ||
          c.id.toLowerCase().includes(needle) ||
          c.district.toLowerCase().includes(needle)
      );
    }
    const sorted = [...list];
    if (sortBy === "id") sorted.sort((a, b) => (asc ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)));
    if (sortBy === "amount") sorted.sort((a, b) => (asc ? a.sanctionedAmountLakh - b.sanctionedAmountLakh : b.sanctionedAmountLakh - a.sanctionedAmountLakh));
    if (sortBy === "score") {
      sorted.sort((a, b) => {
        const gateDiff = Number(b.gate.fired) - Number(a.gate.fired);
        if (gateDiff !== 0) return gateDiff;
        return asc ? a.compositeScore - b.compositeScore : b.compositeScore - a.compositeScore;
      });
    }
    return sorted;
  }, [state.cases, district, filter, q, sortBy, asc]);

  const actionable = state.cases.filter((c) => c.status === "hold_active").length;
  const openGates = state.cases.filter((c) => c.gate.fired && c.status === "hold_active").length;

  const sortHdr = (key: SortKey, label: string) => (
    <th key={key} className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
      <button
        className="inline-flex items-center gap-1 hover:text-navy-900"
        onClick={() => {
          if (sortBy === key) setAsc((v) => !v);
          else {
            setSortBy(key);
            setAsc(key === "score");
          }
        }}
      >
        {label}
        {sortBy === key ? (asc ? "▲" : "▼") : "↕"}
      </button>
    </th>
  );

  return (
    <Shell active="home">
      <div className="mb-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gov-gold">
          District Authority · case review workflow
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">Working queue</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Every recommended work in the district, colour-coded by composite risk. The{" "}
          <span className="font-bold text-red-700">GATE</span> badge is a separate signal: a hard guideline rule
          fired, independent of the score.
        </p>
      </div>

      {/* ── Zone 1: KPI stat strip ─────────────────────────────── */}
      <StatStrip
        items={[
          { label: "Cases in queue", value: state.cases.length, detail: "across 8 districts", icon: <span aria-hidden>🗂️</span> },
          { label: "Actionable holds", value: actionable, detail: "awaiting a district decision", accent: "text-amber-700" },
          { label: "Open gate holds", value: openGates, detail: "critical gates currently holding", accent: "text-gate" },
          { label: "Escalated to audit", value: state.cases.filter((c) => c.status === "escalated").length, detail: "state / ministry level" },
        ]}
      />

      <div className="mt-6">
        <ModeBanner />
      </div>

      <div className="mt-4">
        <AuthBanner compact />
      </div>

      {/* ── Zone 2 (70%) + Zone 3 (30%): workspace + inspector ── */}
      <div className="mt-8 grid gap-6 xl:grid-cols-[7fr_3fr]">
        <div className="min-w-0">
          <Card className="mb-4 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <SelectInput
                value={district}
                onChange={setDistrict}
                options={districts.map((d) => ({ value: d, label: d === "All districts" ? "All districts" : d }))}
              />
              <div className="flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => setFilter(chip.key)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      filter === chip.key
                        ? "border-navy-950 bg-navy-950 text-white"
                        : "border-navy-200 bg-white text-navy-700 hover:bg-navy-50"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <div className="ml-auto w-full sm:w-56">
                <TextInput value={q} onChange={setQ} placeholder="Search work / ID / district…" />
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-xl">
            <div className="flex flex-wrap items-center gap-2 border-b border-navy-100 bg-navy-50/60 px-4 py-2.5">
              <button
                onClick={syncScores}
                disabled={syncingScores}
                className="rounded-md border border-navy-300 bg-white px-3 py-1.5 text-xs font-bold text-navy-800 transition hover:bg-navy-50 disabled:opacity-50"
              >
                {syncingScores ? "Syncing…" : "↻ Sync live scores"}
              </button>
              {state.scoresSynced && state.scoresSyncedAt ? (
                <span className="rounded bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-900">
                  Live scores synced · {state.scoresSyncedAt}
                </span>
              ) : (
                <span className="rounded bg-navy-100 px-2 py-0.5 text-[11px] font-bold text-navy-700">
                  Seed snapshot scores
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse text-sm">
                <thead className="border-b border-navy-200 bg-navy-50">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Work</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">District / DM</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Sanctioned</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Flags</th>
                    {sortHdr("score", "Risk")}
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Gate</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">DM actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {rows.map((c) => {
                    const tint = (() => {
                      if (c.gate.fired) return "bg-red-50/60";
                      const b = scoreBand(c.compositeScore);
                      if (b === "high") return "bg-red-50/30";
                      if (b === "medium") return "bg-amber-50/40";
                      return "";
                    })();
                    const flagModules = c.moduleBreakdown.filter((m) => m.triggered);
                    const isCaseActionable = c.status === "hold_active";
                    const isSelected = selectedId === c.id;
                    return (
                      <tr
                        key={c.id}
                        className={`cursor-pointer ${tint} transition hover:bg-navy-50/80 ${isSelected ? "ring-2 ring-inset ring-gov-gold" : ""}`}
                        onClick={() => setSelectedId(c.id)}
                      >
                        <td className="max-w-[280px] px-3 py-3">
                          <div className="truncate font-bold text-navy-950">{c.title}</div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="font-mono text-[11px] text-slate-500">{c.id}</span>
                            <span className="text-[11px] text-slate-400">{c.category}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="text-xs font-semibold text-navy-900">{c.district}</div>
                          <div className="text-[11px] text-slate-500">DM {c.dmName}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-bold tabular-nums text-navy-900">
                          {inr(c.sanctionedAmountLakh)}
                        </td>
                        <td className="px-3 py-3">
                          {flagModules.length === 0 ? (
                            <span className="text-[11px] text-slate-400">—</span>
                          ) : (
                            <div className="flex max-w-[120px] flex-wrap gap-1">
                              {flagModules.map((m) => (
                                <span
                                  key={m.module}
                                  className="inline-flex items-center rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900"
                                  title={moduleMeta[m.module as ModuleKind].name}
                                >
                                  {moduleMeta[m.module as ModuleKind].short}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <ScoreBar score={c.compositeScore} width={64} />
                        </td>
                        <td className="px-3 py-3">
                          {c.gate.fired ? <GateBadge /> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill status={c.status} gateFired={c.gate.fired} />
                        </td>
                        <td className="px-3 py-3">
                          {isCaseActionable ? (
                            <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={quick(c, "approve")}
                                title="Override hold and record to ledger"
                                className="rounded border border-green-300 bg-green-50 px-2 py-1 text-[10px] font-bold text-green-800 hover:bg-green-100"
                              >
                                ✓ Sanction
                              </button>
                              <button
                                onClick={quick(c, "inspect")}
                                className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-900 hover:bg-amber-100"
                              >
                                🔍 Inspect
                              </button>
                              <button
                                onClick={quick(c, "escalate")}
                                className="rounded border border-red-300 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-800 hover:bg-red-100"
                              >
                                ↑ Escalate
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">select to inspect</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rows.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">No cases match the current filters.</div>
            )}
          </Card>
        </div>

        {/* Zone 3: collapsible inspector */}
        <aside className="min-w-0 xl:sticky xl:top-40 xl:self-start">
          <InspectorPanel kase={selected} onClose={() => setSelectedId(null)} />
        </aside>
      </div>

      {/* Milestone photo approval */}
      <div className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gov-gold">
              Milestone photo approval
            </div>
            <h2 className="mt-1 text-lg font-extrabold text-navy-950">Stage-progress verifications awaiting you</h2>
            <p className="mt-1 text-sm text-slate-600">
              Implementing Agencies submit stage photos for each disbursement; the system auto-compares them
              against the district baseline and you approve the milestone.
            </p>
          </div>
          <Pill className="border-navy-200 bg-navy-50 text-navy-800">{state.milestones.length} pending</Pill>
        </div>

        {state.milestones.length === 0 ? (
          <Card className="mt-4 rounded-xl p-6 text-center text-sm text-slate-500">
            No I.A. milestone requests yet. Open the <span className="font-semibold">Implementing Agency</span>{" "}
            portal (Switch Role) and submit a stage disbursement to see the flow end-to-end.
          </Card>
        ) : (
          <div className="mt-4 space-y-4">
            {state.milestones.map((m) => {
              const c = state.cases.find((x) => x.id === m.workId);
              if (!c) return null;
              const target = photoTargetFor(c);
              const alreadyApproved = m.status === "approved";
              return (
                <Card key={m.workId + m.stage} className="rounded-xl p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">{m.workId}</span>
                        <Pill className="border-navy-200 bg-navy-50 text-navy-800">{m.stage.toUpperCase().replace("_", "-")}</Pill>
                        <span className="text-xs font-bold text-navy-900">{inr(m.amountLakh)} release request</span>
                      </div>
                      <p className="mt-1 truncate text-sm font-bold text-navy-950">{c.title}</p>
                      <p className="text-[11px] text-slate-500">{c.district} · I.A. {pfmsRow(c).vendor} · requested {m.requestedAt}</p>
                    </div>
                    {alreadyApproved ? (
                      <Pill className="border-green-300 bg-green-50 text-green-800">✓ milestone approved — routed to PFMS</Pill>
                    ) : (
                      <button
                        onClick={() => api.approveMilestone(m.workId)}
                        className="rounded-lg bg-navy-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-navy-800"
                      >
                        ✓ Approve milestone release
                      </button>
                    )}
                  </div>
                  <PhotoVerifyInline target={target} compact />
                  {target.forged && !alreadyApproved && (
                    <div className="mt-3">
                      <PhotoAlertBanner matchPct={98.4} workId={c.id} small />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Pill className="border-red-200 bg-red-50 text-red-800">
          <GateBadge small /> = critical-rule hold, independent of the composite column
        </Pill>
        <Pill className="border-green-200 bg-green-50 text-green-800">green &lt;40 · low</Pill>
        <Pill className="border-amber-300 bg-amber-50 text-amber-800">amber 40–69 · medium</Pill>
        <Pill className="border-red-200 bg-red-50 text-red-800">red ≥70 · high</Pill>
      </div>

      <div className="mt-6">
        <HelpNote>
          <b>Try the gate proof-point:</b> open <span className="font-bold text-navy-950">MPL-2025-0244</span>{" "}
          (pin shows at the top of the queue under the Critical gate hold filter) — it holds with a red GATE
          badge on a low composite score. Select any row to drill into the inspector panel; decisions are
          recorded to the <Link href="/ledger" className="font-bold underline">ledger</Link> and the{" "}
          <Link href="/override-audit" className="font-bold underline">Override-Audit</Link> register.
        </HelpNote>
      </div>
    </Shell>
  );
}
