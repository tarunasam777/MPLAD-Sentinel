"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { chainValidity, useApp } from "@/store/AppStore";
import type { LedgerCategory } from "@/lib/types";
import { DangerButton, ExportPdfButton, PrimaryButton } from "@/components/ui";
import { AuditCertLedger } from "@/components/dashboard/audit-certificate";

const catColor: Record<LedgerCategory, string> = {
  genesis: "bg-navy-900 text-white",
  submit: "bg-navy-100 text-navy-800",
  clear: "bg-green-100 text-green-800",
  hold: "bg-amber-100 text-amber-900",
  override: "bg-red-100 text-red-800",
  escalate: "bg-red-100 text-red-800",
  release: "bg-teal-100 text-teal-900",
  reject: "bg-slate-200 text-slate-700",
  audit: "bg-navy-50 text-navy-700",
  system: "bg-slate-100 text-slate-600",
};

export default function LedgerPage() {
  const { state, api } = useApp();
  const [toast, setToast] = useState<string | null>(null);

  const valid = chainValidity(state.ledger);
  const firstBad = valid.findIndex((v) => !v);
  const chainBroken = firstBad !== -1;
  const tamperedIndices = Object.keys(state.tamperOriginal).map(Number);
  const brokenCount = valid.filter((v) => !v).length;

  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 5000);
  };

  const doTamper = () => {
    api.simulateDbTamper();
    showToast("⚠ Database row rewritten & re-sealed — SHA-256 chain corrupted downstream. System frozen for audit.");
  };

  const doRestore = () => {
    api.restoreLedger();
    showToast("✓ Original records restored & chain re-sealed — integrity recovered.");
  };

  const doVerify = () => {
    api.verifyChain();
    window.setTimeout(() => {
      showToast(
        chainBroken
          ? `✗ Verification complete — SHA-256 chain corrupted at block #${firstBad}. Tampering detected.`
          : "✓ Verification complete — all blocks linked cleanly."
      );
    }, 1400);
  };

  return (
    <Shell active="ledger">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-500">
            Integrity & audit trail
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-navy-950">Ledger / Audit Trail</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Each block stores a SHA-256 of the block before it plus its own action, actor and record — so a
            single database edit breaks every subsequent link. <Link href="/public" className="font-bold underline">Citizens can read this same chain.</Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportPdfButton onClick={() => window.print()}>Export Ledger Audit Certificate (PDF)</ExportPdfButton>
          <PrimaryButton onClick={doVerify}>✓ Verify chain integrity</PrimaryButton>
          <DangerButton onClick={doTamper} disabled={chainBroken}>
            💣 Simulate Database Tampering
          </DangerButton>
          {chainBroken && (
            <button
              onClick={doRestore}
              className="inline-flex items-center gap-2 rounded-md border border-green-400 bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-500"
            >
              🔒 Restore Integrity / Re-seal
            </button>
          )}
        </div>
      </div>

      {chainBroken && (
        <div className="gate-pulse mb-4 rounded-md border-2 border-gate bg-red-600 p-4 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/15 text-xl font-black">⛓💥</span>
            <div>
              <div className="text-sm font-extrabold uppercase tracking-wide">
                CRITICAL: SHA-256 Ledger Chain Corruption Detected at Block #{firstBad}. System Frozen for Audit.
              </div>
              <p className="mt-1 text-xs text-red-100">
                A historical record&apos;s amount/status was altered directly in the database, then its hash was
                re-signed. The stored previous-hash in block #{firstBad} no longer equals the re-computed hash of
                block #{firstBad - 1} — {brokenCount} downstream block(s) fail linkage. A forensic audit is
                required; disbursements are frozen until integrity is restored.
              </p>
            </div>
            <span className="ml-auto hidden shrink-0 items-center gap-2 text-right sm:flex">
              <span className="text-2xl" aria-hidden>🔒</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">System frozen<br />for audit</span>
            </span>
          </div>
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-lg border border-navy-200 bg-white shadow-sm">
            <div className="max-h-[78vh] overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[1280px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 border-b border-navy-200 bg-navy-50">
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2.5">Index</th>
                    <th className="px-3 py-2.5">Timestamp</th>
                    <th className="px-3 py-2.5">Action</th>
                    <th className="px-3 py-2.5">Actor / case</th>
                    <th className="px-3 py-2.5">Record</th>
                    <th className="px-3 py-2.5">Prev Hash</th>
                    <th className="px-3 py-2.5">Block Hash</th>
                    <th className="px-3 py-2.5 text-center">Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {state.ledger.map((e) => {
                    const isTampered = tamperedIndices.includes(e.index);
                    const isBad = !valid[e.index] && e.index > 0;
                    const expectedPrev = e.index > 0 ? state.ledger[e.index - 1].hash : null;
                    const rowCls = isTampered
                      ? "bg-red-600 text-white [&_*]:!border-neutral-400"
                      : isBad
                      ? "bg-red-50/80"
                      : e.index % 2 === 1
                      ? "bg-white"
                      : "bg-navy-50/40";
                    return (
                      <tr key={`${e.index}-${state.verifyRunId}`} className={rowCls}>
                        <td className="px-3 py-2.5 align-top">
                          <span className={`inline-flex h-6 w-14 items-center justify-center rounded font-mono text-[11px] font-bold ${isTampered ? "bg-white text-red-700" : "bg-navy-950 text-white"}`}>
                            #{e.index}
                          </span>
                          {isTampered && (
                            <div className="mt-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-yellow-200">
                              <span aria-hidden>💣</span> DB-TAMPERED
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 align-top font-mono text-[10px] text-slate-400">
                          {e.timestamp}
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${catColor[e.category]}`}>
                            {e.action}
                          </span>
                          <div className="mt-1 text-[10px] text-slate-400">{e.category}</div>
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <div className="font-semibold text-navy-900">{e.actor}</div>
                          <div className="text-[11px] text-slate-500">{e.actorRole}</div>
                          {e.caseId && (
                            <Link href={`/cases/${e.caseId}?from=ledger`} className="font-mono text-[11px] font-bold text-navy-600 underline">
                              {e.caseId}
                            </Link>
                          )}
                        </td>
                        <td className="max-w-[300px] px-3 py-2.5 align-top">
                          <div className="text-xs leading-relaxed text-navy-900">{e.body}</div>
                          {isTampered && !isBad && (
                            <span className="mt-1 inline-block rounded bg-yellow-200 px-1.5 py-0.5 text-[10px] font-bold text-yellow-900">
                              ✎ AMOUNT / STATUS ALTERED in DB — re-sealed hash
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <div className="max-w-[150px] break-all font-mono text-[9px] leading-tight text-slate-500">
                            {e.prevHash}
                          </div>
                          {isTampered && expectedPrev && (
                            <div className="mt-1 max-w-[150px] break-all font-mono text-[9px] leading-tight text-amber-200">
                              actual → {e.hash}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <div className={`max-w-[170px] break-all font-mono text-[9px] leading-tight ${isTampered ? "font-bold text-yellow-100" : "text-navy-800"}`}>
                            {e.hash}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center align-top">
                          {isTampered ? (
                            <span className="text-lg font-black text-white" title="Block re-signed after DB tamper">💣</span>
                          ) : isBad ? (
                            <span className="text-lg font-bold text-gate" title="Hash mismatch vs predecessor">✗</span>
                          ) : (
                            <span
                              key={`ck-${state.verifyRunId}`}
                              className={state.verifyRunId > 0 ? "check-drop inline-block text-lg text-green-600" : "inline-block text-lg text-slate-300"}
                              style={state.verifyRunId > 0 ? { animationDelay: `${Math.min(e.index * 80, 1200)}ms` } : undefined}
                            >
                              ✓
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-lg border border-navy-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-navy-950">How the SHA-256 chain works</h3>
            <ol className="mt-3 space-y-3 text-xs text-slate-600">
              <li className="flex gap-2">
                <span className="font-mono font-bold text-navy-700">1</span>
                Each block stores{" "}
                <span className="font-mono font-bold">hash = SHA-256(prevHash | index | action | actor | body | time)</span> — a
                cryptographic fingerprint of the entire history so far.
              </li>
              <li className="flex gap-2">
                <span className="font-mono font-bold text-navy-700">2</span>
                The <span className="font-mono">Prev Hash</span> column holds the <b>full 64-character</b> hash of the block
                above; the <span className="font-mono">Block Hash</span> column is its own fingerprint.
              </li>
              <li className="flex gap-2">
                <span className="font-mono font-bold text-navy-700">3</span>
                Press <b>Simulate Database Tampering</b> — a sealed historical record&apos;s amount/status is rewritten in
                the database and re-signed. Its hash changes, so the next block&apos;s <span className="font-mono">Prev Hash</span>{" "}
                no longer matches, and every block after it is provably broken.
              </li>
              <li className="flex gap-2">
                <span className="font-mono font-bold text-navy-700">4</span>
                <b>Restore Integrity / Re-seal</b> returns the original records, re-hashes the affected blocks, and the
                whole chain verifies clean again — exactly the recovery a forensic audit requires.
              </li>
              <li className="flex gap-2">
                <span className="font-mono font-bold text-navy-700">5</span>
                Citizens connect to this same chain read-only from the public portal.
              </li>
            </ol>
            <div className="mt-4 rounded-md border border-navy-200 bg-navy-50 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Genesis (block 0)</div>
              <div className="mt-1 break-all font-mono text-[10px] text-navy-800">{state.ledger[0]?.hash}</div>
            </div>
            <div className="mt-3 rounded-md border border-navy-200 bg-navy-50 p-3 text-[10px] text-slate-500">
              Reference: <span className="font-mono">sha256(source) → shortHash(10</span>) shown in earlier builds; this
              explorer exposes full hashes for audit verifiability.
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast} tone={toast.startsWith("⚠") || toast.startsWith("✗") ? "err" : "ok"} />}

      <AuditCertLedger ledger={state.ledger} />
    </Shell>
  );
}

function Toast({ message, tone }: { message: string; tone: "ok" | "err" }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(t);
  }, [message]);
  if (!visible) return null;
  return (
    <div
      className={`toast-in fixed bottom-5 right-5 z-50 max-w-sm rounded-md border px-4 py-3 text-sm font-semibold shadow-lg ${
        tone === "ok" ? "border-green-300 bg-green-50 text-green-900" : "border-red-300 bg-red-50 text-red-900"
      }`}
    >
      {message}
    </div>
  );
}