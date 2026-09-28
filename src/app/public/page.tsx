"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useApp, chainValidity } from "@/store/AppStore";
import { DistrictMap } from "@/components/dashboard/district-map";
import { Card, Pill, SelectInput, SectionTitle, TextInput } from "@/components/ui";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { ModeBanner } from "@/components/dashboard/ModeBanner";
import { AllocationTable } from "@/components/dashboard/AllocationTable";
import { inr, statusLabel } from "@/lib/format";
import { districts, mps, STATE_NAME } from "@/lib/data";
import { caseGeo } from "@/lib/geo";
import type { WorkCase } from "@/lib/types";

const PAGE_SIZE = 8;

/** Public-facing status badge: Approved / Delayed / Flagged / In Review. */
function publicBadge(c: WorkCase): { label: string; cls: string } {
  if (c.status === "escalated" || c.gate.fired)
    return { label: "Flagged", cls: "border-red-200 bg-red-50 text-red-800" };
  if (c.status === "hold_active")
    return { label: "Delayed", cls: "border-amber-200 bg-amber-50 text-amber-900" };
  if (c.status === "released" || c.status === "auto_cleared" || c.status === "override_approved")
    return { label: "Approved", cls: "border-green-200 bg-green-50 text-green-800" };
  return { label: "In Review", cls: "border-navy-200 bg-navy-50 text-navy-800" };
}

function Explorer() {
  const { state } = useApp();
  const params = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState(params.get("q") ?? "");
  const [district, setDistrict] = useState("All districts");
  const [page, setPage] = useState(0);

  // React to URL query changes: searching from the header or hero while
  // already on /public previously did nothing because the query was read
  // only on first mount. Syncing from the URL keeps the two in lockstep.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- controlled-input sync from an external source (the URL); same precedent as AppStore hydration.
    setQ(params.get("q") ?? "");
    setPage(0);
  }, [params]);

  const selected = selectedId ? state.cases.find((c) => c.id === selectedId) ?? null : null;

  const rows = useMemo(() => {
    let list = state.cases;
    if (district !== "All districts") list = list.filter((c) => c.district === district);
    if (q.trim()) {
      const n = q.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.id.toLowerCase().includes(n) ||
          c.title.toLowerCase().includes(n) ||
          c.hindiTitle.toLowerCase().includes(n) ||
          c.mpName.toLowerCase().includes(n) ||
          c.constituency.toLowerCase().includes(n) ||
          c.district.toLowerCase().includes(n)
      );
    }
    return list;
  }, [state.cases, district, q]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const totalSanctioned = state.cases.reduce((a, c) => a + c.sanctionedAmountLakh, 0);
  const openGates = state.cases.filter((c) => c.gate.fired).length;
  const allocations = state.analytics.mpAllocations;
  const totalAllocCr = allocations.totalCr.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  const validity = chainValidity(state.ledger);
  const brokenAt = validity.findIndex((v) => !v);
  const lastBlocks = state.ledger.slice(-10).reverse();

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
      <div className="mb-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gov-gold">
          Citizen transparency portal · {STATE_NAME}
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">
          Public works explorer
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          Every MPLADS recommendation, sanction, gate-hold and disbursement is publicly auditable. Funds are
          geo-tagged, photo-verified and logged on an immutable SHA-256 chain.
        </p>
      </div>

      <StatStrip
        items={[
          { label: "Works sanctioned", value: state.cases.length, detail: `${districts.length - 1} districts · ${inr(totalSanctioned)}`, icon: <span aria-hidden>🏗️</span> },
          { label: "Official allocations tracked", value: allocations.mpCount, detail: `₹${totalAllocCr} Cr · all Lok Sabha MPs`, accent: "text-teal-700" },
          { label: "Gate holds under audit", value: openGates, detail: "blocked from release", accent: "text-gate" },
          { label: "Ledger integrity", value: brokenAt === -1 ? "Verified ✓" : `Broken @ #${brokenAt}`, detail: "SHA-256 chain", accent: brokenAt === -1 ? "text-teal-700" : "text-gate" },
        ]}
      />

      <div className="mt-6">
        <ModeBanner />
      </div>

      {/* Zone 2/3: map + selected asset card */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <SectionTitle
            eyebrow="Spatial index"
            title="Geotagged project map"
            subtitle="Green = approved · amber = delayed · red = flagged"
            right={
              <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-600" />approved</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />delayed</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-600" />flagged</span>
              </div>
            }
          />
          <div className="mt-4">
            <DistrictMap cases={state.cases} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        </div>

        <div>
          <SectionTitle eyebrow="Asset card" title="Selected work" />
          <div className="mt-4">
            {selected ? (
              <Card className="rounded-xl p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-500">{selected.id}</span>
                  <Pill className={publicBadge(selected).cls}>{publicBadge(selected).label}</Pill>
                </div>
                <h3 className="mt-3 text-sm font-extrabold leading-snug text-navy-950">{selected.title}</h3>
                <p className="mt-0.5 text-[11px] text-slate-500">{selected.hindiTitle}</p>
                <div className="mt-4 space-y-2 text-xs">
                  {[
                    ["District", selected.district],
                    ["Constituency", selected.constituency],
                    ["MP", selected.mpName],
                    ["Sanctioned", inr(selected.sanctionedAmountLakh)],
                    ["Status", statusLabel[selected.status]],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <span className="text-slate-500">{k}</span>
                      <span className="text-right font-semibold text-navy-900">{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Geo</span>
                    <span className="font-mono text-[11px] text-navy-900">
                      {(() => {
                        const g = caseGeo(selected, Number(selected.id.replace(/[^\d]/g, "").slice(-2)) || 0);
                        return `${g.lat.toFixed(4)}N, ${g.lng.toFixed(4)}E`;
                      })()}
                    </span>
                  </div>
                </div>
                <p className="mt-4 border-t border-navy-100 pt-3 text-[11px] leading-relaxed text-slate-600">
                  {selected.overview}
                </p>
                <Link
                  href={`/cases/${selected.id}`}
                  className="mt-4 inline-block rounded-lg bg-navy-950 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-navy-800"
                >
                  Open full case file →
                </Link>
              </Card>
            ) : (
              <Card className="flex h-full min-h-[240px] items-center justify-center rounded-xl p-8 text-center text-sm text-slate-400">
                Select a pin on the map or a row below to view the public asset record.
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Paginated directory */}
      <div className="mt-10">
        <SectionTitle
          eyebrow="Transparency"
          title="Public asset directory"
          subtitle="Complete register of sanctioned work items — filter by district or search."
        />
        <Card className="mt-4 overflow-hidden rounded-xl">
          <div className="flex flex-wrap items-center gap-3 border-b border-navy-100 bg-navy-50/60 px-4 py-3">
            <SelectInput
              value={district}
              onChange={(d) => {
                setDistrict(d);
                setPage(0);
              }}
              options={districts.map((d) => ({ value: d, label: d }))}
            />
            <div className="ml-auto w-full sm:w-72">
              <TextInput
                value={q}
                onChange={(v) => {
                  setQ(v);
                  setPage(0);
                }}
                placeholder="Search MP, work, ID, district…"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead className="border-b border-navy-200 bg-navy-50">
                <tr>
                  {["Asset / ID", "District", "Constituency", "Amount", "Status"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${i === 3 ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {pageRows.map((c) => {
                  const badge = publicBadge(c);
                  return (
                    <tr
                      key={c.id}
                      className={`cursor-pointer transition hover:bg-navy-50 ${selectedId === c.id ? "bg-navy-50" : ""}`}
                      onClick={() => setSelectedId(c.id)}
                    >
                      <td className="max-w-[360px] px-4 py-3.5">
                        <span className="block truncate font-bold text-navy-950">{c.title}</span>
                        <span className="font-mono text-[11px] text-slate-500">{c.id} · {c.category}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold text-navy-900">{c.district}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-600">{c.constituency}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-bold tabular-nums text-navy-900">
                        {inr(c.sanctionedAmountLakh)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Pill className={badge.cls}>{badge.label}</Pill>
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-sm text-slate-500">
                      No assets match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-navy-100 px-4 py-3 text-xs">
              <span className="text-slate-500">
                Showing {safePage * PAGE_SIZE + 1}–{Math.min(rows.length, (safePage + 1) * PAGE_SIZE)} of {rows.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="rounded-lg border border-navy-200 px-3 py-1 font-bold text-navy-800 transition hover:bg-navy-50 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <span className="font-semibold tabular-nums text-navy-900">
                  {safePage + 1} / {pageCount}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={safePage >= pageCount - 1}
                  className="rounded-lg border border-navy-200 px-3 py-1 font-bold text-navy-800 transition hover:bg-navy-50 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Ledger preview */}
      <div className="mt-10">
        <SectionTitle
          eyebrow="Democratic oversight"
          title="Public audit ledger explorer"
          subtitle="Read-only view of the SHA-256 block chain behind every decision."
          right={
            brokenAt === -1 ? (
              <Pill className="border-green-300 bg-green-50 text-green-800">✓ Chain integrity verified</Pill>
            ) : (
              <Pill className="border-red-300 bg-red-50 text-red-800">⚠ Chain corrupted at block #{brokenAt}</Pill>
            )
          }
        />
        <Card className="mt-4 overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-xs">
              <thead className="border-b border-navy-200 bg-navy-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  {["#", "Timestamp", "Action", "Actor", "Prev hash", "Block hash"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {lastBlocks.map((e) => {
                  const linkBroken = e.index > 0 && !validity[e.index];
                  return (
                    <tr key={e.index} className={linkBroken ? "bg-red-50" : ""}>
                      <td className="px-4 py-2.5 font-mono text-navy-400">{e.index}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{e.timestamp}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-navy-900">{e.action}</td>
                      <td className="px-4 py-2.5 text-slate-600">{e.actor}</td>
                      <td className="max-w-[150px] truncate px-4 py-2.5 font-mono text-[10px] text-slate-500">{e.prevHash}</td>
                      <td className="max-w-[150px] truncate px-4 py-2.5 font-mono text-[10px] text-navy-800">
                        {e.hash}
                        {linkBroken && <span className="ml-1 font-bold text-gate">✕</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="mt-6 rounded-xl border border-navy-200 bg-white p-6 text-xs leading-relaxed text-slate-600">
          <p className="mb-1 font-bold text-navy-950">Citizen rights &amp; democratic oversight</p>
          Public scrutiny is the first audit layer. Every gate hold shown here froze a release that would
          otherwise have paid out public money — you can see exactly which rule fired and who recorded it. For
          the tamper-detection demo, open the{" "}
          <Link href="/ledger" className="font-bold underline">Ledger</Link> and press «Simulate Database
          Tampering». All data is synthetic demonstration data.
        </div>

        {/* Official MoSPI allocation register — all 543 Lok Sabha MPs */}
        <div className="mt-10">
          <SectionTitle
            eyebrow="Official data"
            title="MP allocation register — official MoSPI table"
            subtitle="“Allocated Limit for Hon'ble MPs” — the published allocation limit for every Lok Sabha constituency."
          />
          <div className="mt-4">
            <AllocationTable allocations={state.analytics.mpAllocations.mps} highlightNames={mps} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicDashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header active="public" />
      <main id="main-content" className="flex-1">
        <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16 text-sm text-slate-500">Loading explorer…</div>}>
          <Explorer />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
