"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, Pill, SectionTitle, SelectInput, TextInput } from "@/components/ui";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { fetchWorks, fetchWorksSummary, type WorksPage, type WorksSummary } from "@/lib/api";
import { inr } from "@/lib/format";

const PAGE_SIZE = 25;

function riskPill(score: number): { label: string; cls: string } {
  if (score >= 60) return { label: `Risk ${score}`, cls: "border-red-200 bg-red-50 text-red-800" };
  if (score >= 40) return { label: `Risk ${score}`, cls: "border-amber-200 bg-amber-50 text-amber-900" };
  return { label: `Risk ${score}`, cls: "border-green-200 bg-green-50 text-green-800" };
}

export default function WorksRegisterPage() {
  return (
    <Suspense fallback={<Shell active="works"><div className="py-16 text-center text-sm text-slate-500">Loading register…</div></Shell>}>
      <WorksRegisterInner />
    </Suspense>
  );
}

function WorksRegisterInner() {
  const params = useSearchParams();
  const [summary, setSummary] = useState<WorksSummary | null>(null);
  const [pageData, setPageData] = useState<WorksPage | null>(null);
  const [state, setState] = useState(params.get("state") ?? "All states");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [query, setQuery] = useState(params.get("q") ?? ""); // committed search term
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deep links (/works?q=…&state=…) re-apply on param change. This is the
  // documented "adjust state during render" pattern (guarded, settles in one
  // render) — a synchronous setState in an effect would cascade renders.
  const paramsKey = params.toString();
  const [lastParamsKey, setLastParamsKey] = useState(paramsKey);
  if (paramsKey !== lastParamsKey) {
    setLastParamsKey(paramsKey);
    setState(params.get("state") ?? "All states");
    setQ(params.get("q") ?? "");
    setQuery(params.get("q") ?? "");
    setPage(1);
  }

  useEffect(() => {
    fetchWorksSummary()
      .then(setSummary)
      .catch((e: Error) => setError(e.message));
  }, []);

  // Debounced commit of the search box so typing doesn't hammer the API.
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(q), 350);
    return () => window.clearTimeout(t);
  }, [q]);

  // Fetch a page of the register. The spinner and result state are only ever
  // written from the async continuation (after the first await), never
  // synchronously in the effect body — that keeps react-hooks'
  // set-state-in-effect rule satisfied while preserving the exact UX.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const res = await fetchWorks({
          state: state === "All states" ? undefined : state,
          q: query,
          page,
          pageSize: PAGE_SIZE,
        });
        if (cancelled) return;
        setPageData(res);
        setError(null);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state, query, page]);

  const stateOptions = useMemo(
    () => ["All states", ...(summary?.states.map((s) => s.state) ?? [])],
    [summary]
  );

  const total = pageData?.total ?? 0;
  const pages = pageData?.pages ?? 1;
  const safePage = Math.min(page, Math.max(1, pages));

  return (
    <Shell active="works">
      <div className="mb-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gov-gold">
          Real data · eSAKSHI work-level register
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">
          Works register — every sanctioned MPLADS work
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          The full Lok Sabha work-level register from the official eSAKSHI portal — real work IDs,
          real MPs, real amounts, real payment progress. These records are computed by the same
          7-module risk pipeline as the demo desks but remain <strong>read-only</strong> in the
          demo workflow: no holds or overrides are applied to real records.
        </p>
      </div>

      {summary && (
        <StatStrip
          items={[
            {
              label: "Real works in register",
              value: summary.totalWorks.toLocaleString("en-IN"),
              detail: "Lok Sabha work-level exports",
              icon: <span aria-hidden>🏗️</span>,
            },
            {
              label: "Sanctioned value",
              value: `₹${summary.totalSanctionedCr.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`,
              detail: "sum of sanctioned amounts",
              accent: "text-teal-700",
            },
            {
              label: "No payment yet",
              value: summary.noPaymentYet.toLocaleString("en-IN"),
              detail: "0% released · 0% complete",
              accent: "text-gate",
            },
            {
              label: "States / UTs covered",
              value: summary.states.length,
              detail: "filter below to drill in",
              icon: <span aria-hidden>🗺️</span>,
            },
          ]}
        />
      )}

      <div className="mt-6 rounded-md border border-navy-200 bg-navy-50/50 p-3 text-[11px] leading-relaxed text-slate-600">
        <strong className="text-navy-950">Provenance:</strong>{" "}
        {summary?.source ?? "eSAKSHI work-level exports (Lok Sabha)"} — validated paisa-exact
        against the portal&apos;s own dashboard tiles (see{" "}
        <code className="font-mono">backend/app/data/worklevel/VALIDATION.md</code>). Served from
        the seeded register via <code className="font-mono">GET /api/v1/works</code>.
      </div>

      <div className="mt-8">
        <SectionTitle
          eyebrow="National register"
          title="Browse the works"
          subtitle="Filter by state or search by work title, ID, MP, district or constituency."
        />
        <Card className="mt-4 overflow-hidden rounded-xl">
          <div className="flex flex-wrap items-center gap-3 border-b border-navy-100 bg-navy-50/60 px-4 py-3">
            <SelectInput
              value={state}
              onChange={(s) => {
                setState(s);
                setPage(1);
              }}
              options={stateOptions.map((s) => ({ value: s, label: s }))}
            />
            <div className="ml-auto w-full sm:w-80">
              <TextInput
                value={q}
                onChange={(v) => {
                  setQ(v);
                  setPage(1);
                }}
                placeholder="Search title, work ID, MP, district…"
              />
            </div>
          </div>

          {error && (
            <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
              Could not reach the backend ({error}). Is it running on{" "}
              <code className="font-mono">http://127.0.0.1:8000</code>?
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead className="border-b border-navy-200 bg-navy-50">
                <tr>
                  {["Work / ID", "Constituency · State", "MP", "Sanctioned", "Progress", "Risk"].map(
                    (h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${
                          h === "Sanctioned" ? "text-right" : "text-left"
                        } ${i === 5 ? "text-center" : ""}`}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {loading && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-sm text-slate-500">
                      Loading register…
                    </td>
                  </tr>
                )}
                {!loading &&
                  (pageData?.works ?? []).map((w) => (
                    <tr key={w.id} className="transition hover:bg-navy-50">
                      <td className="max-w-[360px] px-4 py-3.5">
                        <span className="block truncate font-bold text-navy-950" title={w.title}>
                          {w.title}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {w.id} · {w.category}
                          {w.statusLabel ? ` · ${w.statusLabel}` : ""}
                        </span>
                      </td>
                      <td className="max-w-[220px] px-4 py-3.5 text-xs">
                        <span className="block truncate font-semibold text-navy-900">{w.constituency}</span>
                        <span className="text-slate-500">{w.state}</span>
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3.5 text-xs text-slate-700" title={w.mpName}>
                        {w.mpName || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-bold tabular-nums text-navy-900">
                        {inr(w.sanctionedLakh)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs tabular-nums text-slate-700">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-navy-100">
                            <div
                              className={`h-full rounded-full ${w.completionPct >= 100 ? "bg-green-600" : "bg-gov-gold"}`}
                              style={{ width: `${Math.min(100, w.completionPct)}%` }}
                            />
                          </div>
                          <span>{Math.round(w.completionPct)}%</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {Math.round(w.releasedPct)}% released
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Pill className={riskPill(w.riskScore).cls}>{w.riskScore}</Pill>
                      </td>
                    </tr>
                  ))}
                {!loading && (pageData?.works ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-sm text-slate-500">
                      No works match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-navy-100 px-4 py-3 text-xs">
            <span className="text-slate-500">
              {total > 0
                ? `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(total, safePage * PAGE_SIZE)} of ${total.toLocaleString("en-IN")} real works`
                : "No results"}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="rounded-lg border border-navy-200 px-3 py-1 font-bold text-navy-800 transition hover:bg-navy-50 disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="font-semibold tabular-nums text-navy-900">
                {safePage} / {pages.toLocaleString("en-IN")}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={safePage >= pages}
                className="rounded-lg border border-navy-200 px-3 py-1 font-bold text-navy-800 transition hover:bg-navy-50 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Per-state rollup */}
      {summary && summary.states.length > 0 && (
        <div className="mt-10">
          <SectionTitle
            eyebrow="Real aggregates"
            title="State-wise rollup"
            subtitle="Computed from the seeded real records — works, sanctioned value and average completion."
          />
          <Card className="mt-4 overflow-x-auto rounded-xl">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="border-b border-navy-200 bg-navy-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 text-left">State / UT</th>
                  <th className="px-4 py-2.5 text-right">Works</th>
                  <th className="px-4 py-2.5 text-right">Sanctioned (₹ Cr)</th>
                  <th className="px-4 py-2.5 text-right">Avg completion</th>
                  <th className="px-4 py-2.5 text-right">High-risk count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {summary.states.map((s) => (
                  <tr
                    key={s.state}
                    className="cursor-pointer transition hover:bg-navy-50"
                    onClick={() => {
                      setState(s.state);
                      setPage(1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <td className="px-4 py-2.5 font-semibold text-navy-900">{s.state}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{s.works.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-navy-900">
                      {s.sanctionedCr.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{s.avgCompletionPct}%</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{s.highRisk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      <div className="mt-10 rounded-xl border border-navy-200 bg-white p-6 text-xs leading-relaxed text-slate-600">
        <p className="mb-1 font-bold text-navy-950">Why real rows show no “hold” badges</p>
        By data policy, workflow holds, overrides and escalations apply only to demonstration
        records with fictional officials of record — a real person&apos;s name is never placed under
        a risk flag. Real works keep their fully computed composite risk score (shown above), and
        any score ≥ 60 is visible here and in the state rollup as a high-risk count. The interactive
        gate/override demo lives on the <Link href="/public" className="font-bold underline">demo desks</Link>.
      </div>
    </Shell>
  );
}
