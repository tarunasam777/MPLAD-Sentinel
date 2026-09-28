"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SearchX, ArrowLeft } from "lucide-react";
import { Shell } from "@/components/shell";
import { UniversalSearch } from "@/components/search/UniversalSearch";
import {
  fetchUniversalSearch,
  type SearchGroup,
  type SearchResponse,
} from "@/lib/api";
import { inr } from "@/lib/format";

/**
 * Full-page universal search results. Every group deep-links into the right
 * surface: works → /works?q=, cases → /cases/[id], MPs → /dashboard/mp?mp=,
 * officials → /override-audit, ledger → /ledger, states → /works?state=.
 */

const PAGE_SIZE_GROUP = 12;

const groupIcons: Record<SearchGroup["key"], string> = {
  works: "🏗️",
  cases: "📁",
  mps: "👤",
  officials: "🏛️",
  ledger: "🔗",
  states: "🗺️",
};

function hitPrimary(g: SearchGroup["key"], r: SearchGroup["results"][number]): string {
  switch (g) {
    case "works":
      return r.title ?? r.id ?? "";
    case "cases":
      return r.title ?? r.id ?? "";
    case "mps":
      return r.name ?? "";
    case "officials":
      return `${r.name ?? ""}${r.role ? ` — ${r.role}` : ""}`;
    case "ledger":
      return r.body ?? r.action ?? "";
    case "states":
      return r.name ?? "";
  }
}

function hitSecondary(g: SearchGroup["key"], r: SearchGroup["results"][number]): string {
  switch (g) {
    case "works":
      return [
        r.mpName,
        r.district,
        r.state,
        r.category,
        r.sanctionedLakh !== undefined ? inr(r.sanctionedLakh) : "",
        r.id,
      ]
        .filter(Boolean)
        .join(" · ");
    case "cases":
      return [r.id, r.mpName, r.district, `status: ${r.status}`, `risk: ${r.riskScore}`]
        .filter(Boolean)
        .join(" · ");
    case "mps":
      return r.usedCr !== undefined ? `₹${r.usedCr} Cr utilised of entitlement` : "";
    case "officials":
      return [r.district, r.role].filter(Boolean).join(" · ");
    case "ledger":
      return `Block #${r.index} · ${r.action} · ${r.actor}`;
    case "states":
      return "State rollup — view works register";
  }
}

function GroupSection({ group }: { group: SearchGroup }) {
  const shown = group.results.slice(0, PAGE_SIZE_GROUP);
  return (
    <section className="rounded-xl border border-navy-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-navy-100 px-4 py-2.5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
          {groupIcons[group.key]} {group.label}
        </h2>
        <span className="text-xs font-semibold text-slate-500">
          {group.total.toLocaleString("en-IN")} match{group.total === 1 ? "" : "es"}
        </span>
      </header>
      <ul className="divide-y divide-navy-50">
        {shown.map((r, i) => (
          <li key={i}>
            <Link
              href={r.href}
              className="flex flex-col gap-0.5 px-4 py-2.5 transition hover:bg-navy-50"
            >
              <span className="truncate text-sm font-semibold text-navy-900">
                {hitPrimary(group.key, r)}
              </span>
              <span className="truncate text-xs text-slate-500">
                {hitSecondary(group.key, r)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Results() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const [resp, setResp] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const trimmedQ = q.trim();
  // Empty query resets any stale results via React's guarded "adjust state
  // during render" pattern instead of a synchronous setState in the effect.
  if (trimmedQ === "" && (resp !== null || loading || error !== null)) {
    setResp(null);
    setLoading(false);
    setError(null);
  }

  useEffect(() => {
    if (trimmedQ === "") return;
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setError(null);
      try {
        const r = await fetchUniversalSearch(trimmedQ, 12);
        if (cancelled) return;
        setResp(r);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trimmedQ]);

  const groups = resp?.groups ?? [];
  const totalHits = groups.reduce((a, g) => a + g.total, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Search bar mirroring the header's, so a user can refine in place. */}
      <div className="rounded-xl border border-navy-200 bg-white p-4 shadow-sm">
        <UniversalSearch />
      </div>

      {q.trim() === "" ? (
        <div className="rounded-xl border border-navy-200 bg-white p-10 text-center shadow-sm">
          <Search className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-slate-600">
            Type a query above to search across the whole program — real works,
            demo cases, MPs, officials, ledger blocks and states.
          </p>
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-navy-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          Searching…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-gate/30 bg-red-50 p-6 text-sm font-semibold text-red-800 shadow-sm">
          Search failed: {error}. The backend may be starting — try again shortly.
        </div>
      ) : totalHits === 0 ? (
        <div className="rounded-xl border border-navy-200 bg-white p-10 text-center shadow-sm">
          <SearchX className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-slate-600">
            No matches for “{q}” anywhere in the program.
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mx-auto mt-4 inline-flex items-center gap-2 rounded-md border border-navy-300 px-3 py-1.5 text-xs font-bold text-navy-800 transition hover:bg-navy-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Go back
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            <b>{totalHits.toLocaleString("en-IN")}</b> result
            {totalHits === 1 ? "" : "s"} for <b>“{q}”</b> across{" "}
            {groups.length} area{groups.length === 1 ? "" : "s"} of the program.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {groups.map((g) => (
              <GroupSection key={g.key} group={g} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Shell active="search">
      <div className="mb-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gov-gold">
          Universal search
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">
          Search everything
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          One query across the entire program: the real eSAKSHI works register,
          interactive demo cases, MPs and their official MoSPI allocations,
          officials in the override-audit register, sealed SHA-256 ledger
          blocks, and state rollups.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="rounded-xl border border-navy-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
            Loading search…
          </div>
        }
      >
        <Results />
      </Suspense>
    </Shell>
  );
}
