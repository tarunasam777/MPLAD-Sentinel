"use client";

import { useMemo, useState } from "react";
import { Card, Pill, TextInput } from "@/components/ui";
import type { MpAllocationRow } from "@/lib/mp-allocations";

const PAGE_SIZE = 12;

/**
 * Read-only register of the official MoSPI “Allocated Limit for Hon'ble
 * MPs” table — all Lok Sabha MPs with their published allocation limit.
 */
export function AllocationTable({
  allocations,
  highlightNames,
}: {
  allocations: MpAllocationRow[];
  /** Demo MPs to visually anchor (e.g. the state slice shown in the demo). */
  highlightNames?: string[];
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const highlight = useMemo(() => new Set((highlightNames ?? []).map((n) => n.toLowerCase())), [highlightNames]);

  const rows = useMemo(() => {
    if (!q.trim()) return allocations;
    const n = q.trim().toLowerCase();
    return allocations.filter(
      (r) => r.mpName.toLowerCase().includes(n) || r.state.toLowerCase().includes(n) || r.constituency.toLowerCase().includes(n)
    );
  }, [allocations, q]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const withAmount = rows.filter((r) => r.allocatedCr !== null).length;

  return (
    <Card className="overflow-hidden rounded-xl">
      <div className="flex flex-wrap items-center gap-3 border-b border-navy-100 bg-navy-50/60 px-4 py-3">
        <div>
          <span className="text-sm font-bold text-navy-950">Official allocation register</span>
          <span className="ml-2 text-[11px] text-slate-500">
            {rows.length} MPs · {withAmount} with published amounts
          </span>
        </div>
        <div className="ml-auto w-full sm:w-64">
          <TextInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(0);
            }}
            placeholder="Search MP, state, constituency…"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="border-b border-navy-200 bg-navy-50">
            <tr>
              {["#", "Hon'ble MP", "State", "Constituency", "Allocated limit"].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${
                    i === 4 ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {pageRows.map((r) => {
              const idx = allocations.indexOf(r) + 1;
              const isHighlighted = highlight.has(r.mpName.toLowerCase());
              return (
                <tr key={`${r.mpName}-${r.constituency}`} className={isHighlighted ? "bg-amber-50/60" : "hover:bg-navy-50/70"}>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">{idx}</td>
                  <td className="px-4 py-2.5 font-semibold text-navy-950">
                    {r.mpName}
                    {isHighlighted && (
                      <Pill className="ml-2 border-amber-300 bg-amber-100 text-amber-900">demo state</Pill>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-600">{r.state}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-navy-900">{r.constituency}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold tabular-nums text-navy-900">
                    {r.allocatedCr === null ? (
                      <span className="text-[11px] font-normal italic text-slate-400">pending revision</span>
                    ) : (
                      `₹${r.allocatedCr.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`
                    )}
                  </td>
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-sm text-slate-500">
                  No MPs match your search.
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
  );
}
