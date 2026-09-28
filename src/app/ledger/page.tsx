"use client";

import Link from "next/link";
import { Fragment, Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertOctagon,
  CheckCircle2,
  Copy,
  Edit3,
  FileWarning,
  Lock,
  RotateCcw,
  Search,
  SearchX,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Shell } from "@/components/shell";
import { chainValidity, useApp } from "@/store/AppStore";
import type { LedgerCategory } from "@/lib/types";
import { encodeBody, formatAmount, splitBody } from "@/lib/ledger-edits";
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
  ingestion: "bg-sky-100 text-sky-800",
};

/** Unknown/legacy categories must degrade to a neutral chip, never render
 *  `undefined` into the className (backend can add categories first). */
const catChip = (category: string): string =>
  catColor[category as LedgerCategory] ?? "bg-slate-100 text-slate-600";

/** Marker appended by the mock-mode global simulate action. It is part of
 *  the stored body (data layer / certificate detection) but must never be
 *  rendered — display strips it and relies on status badges instead. */
const MOCK_TAMPER_MARKER = "⚠ DB-TAMPERED·AMOUNT/STATUS-ALTERED";

/** Fields a search term is matched against, case-insensitive: Case ID,
 *  block hash, previous hash, official name/role (e.g. "District
 *  Magistrate"), action state, actor id and record payload. */
const searchableText = (e: {
  index: number;
  action: string;
  category: string;
  actor: string;
  actorRole: string;
  body: string;
  caseId?: string;
  hash: string;
  prevHash: string;
}): string =>
  [
    `#${e.index}`,
    e.caseId ?? "",
    e.hash,
    e.prevHash,
    e.actor,
    e.actorRole,
    e.action,
    e.category,
    e.body,
  ]
    .join(" ")
    .toLowerCase();

export default function LedgerPage() {
  return (
    <Suspense fallback={<Shell active="ledger"><div className="py-16 text-center text-sm text-slate-500">Loading ledger…</div></Shell>}>
      <LedgerPageInner />
    </Suspense>
  );
}

function LedgerPageInner() {
  const { state, api } = useApp();
  const params = useSearchParams();
  const [toast, setToast] = useState<{ message: string; tone: "ok" | "err" } | null>(null);
  const [query, setQuery] = useState("");
  /** Inline "Simulate Direct DB Mutation" editor: block index + payload. */
  const [edit, setEdit] = useState<{ index: number; body: string } | null>(null);

  /* Deep link from universal search: /ledger?q=<block index> — pre-fills
     the search box and scrolls to the block once the table renders. */
  const focusIndex = params.get("q");
  const didFocus = useRef(false);
  useEffect(() => {
    if (focusIndex && !didFocus.current && state.ledger.length > 0) {
      setQuery(focusIndex);
      didFocus.current = true;
    }
  }, [focusIndex, state.ledger.length]);
  const focusRowRef = useRef<HTMLTableRowElement | null>(null);
  useEffect(() => {
    // Runs once the ledger rows exist — bootstrap data is async, so the
    // focused row may not be rendered at mount.
    if (state.ledger.length > 0) {
      focusRowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [state.ledger.length]);

  const valid = chainValidity(state.ledger);
  const firstBad = valid.findIndex((v) => !v);
  const chainBroken = firstBad !== -1;
  /** Blocks under the tamper treatment — BOTH paths feed the same set: the
   *  per-block / global mutation buttons (tamperOriginal), the manual
   *  amount/status editor (editedBlocks), and — in live mode — the
   *  re-sealed source of a broken link: a mutated block is internally
   *  consistent (its own hash was re-signed), so the first failing block's
   *  predecessor is provably the mutated record. */
  const tamperedIndices = [
    ...Object.keys(state.tamperOriginal).map(Number),
    ...state.editedBlocks,
    ...(firstBad > 0 ? [firstBad - 1] : []),
  ];
  const brokenCount = valid.filter((v) => !v).length;

  const showToast = (message: string, tone: "ok" | "err") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 5000);
  };

  const doTamper = () => {
    const live = state.mode === "live";
    api.simulateDbTamper();
    showToast(
      live
        ? "Tamper simulation is available in mock demo mode only."
        : "Database record rewritten and re-sealed — SHA-256 chain linkage corrupted downstream. System frozen for audit.",
      "err"
    );
  };

  const doVerify = () => {
    api.verifyChain();
    window.setTimeout(() => {
      showToast(
        chainBroken
          ? `Verification complete — SHA-256 chain linkage broken at index #${firstBad}. ${brokenCount} downstream block(s) fail linkage.`
          : "Verification complete — all blocks linked cleanly.",
        chainBroken ? "err" : "ok"
      );
    }, 1400);
  };

  const doRestore = () => {
    api.restoreLedger();
    setEdit(null);
    showToast("Original records restored and chain re-sealed — integrity recovered.", "ok");
  };

  /** Open the inline mutation editor for a sealed block. A frozen (broken)
   *  chain refuses further mutations until integrity is restored. */
  const startMutation = (index: number) => {
    if (chainBroken) {
      showToast("System frozen for forensic audit — restore integrity before further mutations.", "err");
      return;
    }
    if (index <= 0) return;
    const entry = state.ledger.find((e) => e.index === index);
    if (!entry) return;
    setEdit({ index, body: entry.body.replace(MOCK_TAMPER_MARKER, "").trim() });
  };

  /** Writes the payload directly and re-signs ONLY this block's hash —
   *  no downstream hash is repaired — so chain linkage breaks at the
   *  child exactly like any unauthorized database mutation. */
  const saveMutation = (index: number, body: string) => {
    if (!body.trim()) {
      showToast("Record payload cannot be empty.", "err");
      return;
    }
    api.tamperLedgerAt(index, body);
    setEdit(null);
    showToast(
      `Block #${index} record payload rewritten directly and re-sealed — SHA-256 chain linkage broken downstream. System frozen for audit.`,
      "err"
    );
  };

  /** Real-time search across Case ID, hashes, official role, action state,
   *  actor — display-only; the verification array is computed on the full
   *  ledger and is unaffected by filtering. */
  const q = query.trim().toLowerCase();
  const visible = q ? state.ledger.filter((e) => searchableText(e).includes(q)) : state.ledger;

  return (
    <Shell active="ledger">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-500">
            Integrity &amp; audit trail
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-navy-950">Ledger / Audit Trail</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Each block stores a SHA-256 of the block before it plus its own action, actor and record — so a
            single database edit breaks every subsequent link. <Link href="/public" className="font-bold underline">Citizens can read this same chain.</Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportPdfButton onClick={() => window.print()}>Export Ledger Audit Certificate (PDF)</ExportPdfButton>
          <PrimaryButton onClick={doVerify}>
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Verify chain integrity
          </PrimaryButton>
          <DangerButton onClick={doTamper} disabled={chainBroken}>
            <ShieldAlert className="h-4 w-4" aria-hidden />
            Simulate Database Tampering
          </DangerButton>
          {chainBroken && (
            <button
              onClick={doRestore}
              className="inline-flex items-center gap-2 rounded-md border border-green-400 bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-500"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Restore Integrity / Re-seal
            </button>
          )}
        </div>
      </div>

      {chainBroken && (
        <div className="gate-pulse mb-4 rounded-md border-2 border-gate bg-red-600 p-4 text-white">
          <div className="flex items-center gap-3">
            <AlertOctagon className="h-10 w-10 shrink-0" aria-hidden />
            <div>
              <div className="text-sm font-extrabold uppercase tracking-wide">
                Cryptographic mutation detected: hash chain linkage broken at index #{firstBad}. System frozen for audit.
              </div>
              <p className="mt-1 text-xs text-red-100">
                A historical record was altered directly in the database, then its hash was re-signed. The stored
                previous-hash in block #{firstBad} no longer equals the re-computed hash of block #{firstBad - 1} —{" "}
                {brokenCount} downstream block(s) fail linkage. A forensic audit is required; disbursements are
                frozen until integrity is restored.
              </p>
            </div>
            <span className="ml-auto hidden shrink-0 items-center gap-2 text-right sm:flex">
              <Lock className="h-6 w-6" aria-hidden />
              <span className="text-[10px] font-bold uppercase tracking-widest">System frozen<br />for audit</span>
            </span>
          </div>
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {/* Search — filters across Case ID, Block Hash, Official Role,
              Action State and Actor in real time. */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Case ID, block hash, official role, action state, actor…"
                aria-label="Search ledger blocks"
                className="w-full rounded-md border border-navy-300 bg-white py-2 pl-9 pr-3 text-sm text-navy-950 placeholder-slate-400 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-200"
              />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {q ? `${visible.length} of ${state.ledger.length} blocks match` : `${state.ledger.length} blocks`}
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-navy-200 bg-white shadow-sm">
            <div className="max-h-[78vh] overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[1440px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 border-b border-navy-200 bg-navy-50">
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2.5">Index</th>
                    <th className="px-3 py-2.5">Timestamp</th>
                    <th className="px-3 py-2.5">Action</th>
                    <th className="px-3 py-2.5">Actor / case</th>
                    <th className="px-3 py-2.5">Record</th>
                    <th className="px-3 py-2.5 text-right">Amount (₹L)</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Prev Hash</th>
                    <th className="px-3 py-2.5">Block Hash</th>
                    <th className="px-3 py-2.5 text-center">Check</th>
                    <th className="px-3 py-2.5 text-center">Mutation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-3 py-10 text-center">
                        <SearchX className="mx-auto h-6 w-6 text-slate-300" aria-hidden />
                        <div className="mt-2 text-sm font-semibold text-slate-500">
                          No ledger blocks match “{query}”.
                        </div>
                      </td>
                    </tr>
                  )}
                  {visible.map((e) => {
                    const isTampered = tamperedIndices.includes(e.index);
                    const isBad = !valid[e.index] && e.index > 0;
                    const expectedPrev = e.index > 0 ? state.ledger[e.index - 1].hash : null;
                    const cleanBody = e.body.replace(MOCK_TAMPER_MARKER, "").trim();
                    const parsed = splitBody(cleanBody);
                    const isEditing = edit?.index === e.index;
                    const mutable = e.index > 0 && !chainBroken && !isTampered;
                    const isFocused = focusIndex !== null && String(e.index) === focusIndex;
                    const rowCls = isTampered
                      ? "bg-red-600 text-white [&_*]:!border-neutral-400"
                      : isBad
                      ? "bg-red-50/80"
                      : isFocused
                      ? "bg-amber-100/70 ring-2 ring-inset ring-amber-400"
                      : e.index % 2 === 1
                      ? "bg-white"
                      : "bg-navy-50/40";
                    return (
                      <Fragment key={`${e.index}-${state.verifyRunId}`}>
                        <tr ref={isFocused ? focusRowRef : undefined} className={rowCls}>
                          <td className="px-3 py-2.5 align-top">
                            <span className={`inline-flex h-6 w-14 items-center justify-center rounded font-mono text-[11px] font-bold ${isTampered ? "bg-white text-red-700" : "bg-navy-950 text-white"}`}>
                              #{e.index}
                            </span>
                            {isTampered && (
                              <div className="mt-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-yellow-200">
                                <ShieldAlert className="h-3 w-3" aria-hidden /> DB-TAMPERED
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-top font-mono text-[10px] text-slate-400">
                            {e.timestamp}
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${catChip(e.category)}`}>
                              {e.action}
                            </span>
                            <div className="mt-1 text-[10px] text-slate-400">{e.category}</div>
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <div className="font-semibold text-navy-900">{e.actor}</div>
                            <div className="text-[11px] text-slate-500">{e.actorRole}</div>
                            {e.caseId && !e.caseId.includes("/") ? (
                              <Link href={`/cases/${e.caseId}?from=ledger`} className="font-mono text-[11px] font-bold text-navy-600 underline">
                                {e.caseId}
                              </Link>
                            ) : e.caseId ? (
                              /* Real WS/… ids contain slashes — no detail route
                                 exists for them; render as text, not a 404 link. */
                              <span className="font-mono text-[11px] text-slate-500">{e.caseId}</span>
                            ) : null}
                          </td>
                          <td className="max-w-[300px] px-3 py-2.5 align-top">
                            <div className="text-xs leading-relaxed text-navy-900">{parsed.head}</div>
                            {isTampered && !isBad && (
                              <span className="mt-1 inline-block rounded bg-yellow-200 px-1.5 py-0.5 text-[10px] font-bold text-yellow-900">
                                RECORD ALTERED IN DB — RE-SEALED HASH
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right align-top">
                            <span
                              className={`inline-block rounded px-1 py-0.5 font-mono text-xs font-bold ${isTampered ? "text-white" : "text-navy-900"}`}
                            >
                              {parsed.amount !== null ? `₹${formatAmount(parsed.amount)}` : "—"}
                              {isTampered && (
                                <span className="mt-0.5 block text-[9px] font-black uppercase tracking-wider text-yellow-200">
                                  altered
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${isTampered ? "bg-yellow-200 text-yellow-900" : "bg-slate-100 text-slate-700"}`}>
                              {parsed.status ?? "—"}
                            </span>
                          </td>
                          <td className="w-[150px] px-3 py-2.5 align-top">
                            <HashCell hash={e.prevHash} dim />
                            {isTampered && expectedPrev && (
                              <div className="mt-1 font-mono text-[9px] leading-tight text-amber-200">
                                actual re-signed hash: <HashCell hash={e.hash} dim />
                              </div>
                            )}
                          </td>
                          <td className="w-[170px] px-3 py-2.5 align-top">
                            <HashCell hash={e.hash} highlight={isTampered} />
                          </td>
                          <td className="px-3 py-2.5 text-center align-top">
                            {isBad ? (
                              <XCircle className="h-5 w-5 text-gate" aria-label="Hash mismatch vs predecessor" />
                            ) : isTampered ? (
                              <FileWarning className="h-5 w-5 text-white" aria-label="Block re-signed after database mutation" />
                            ) : (
                              <CheckCircle2
                                key={`ck-${state.verifyRunId}`}
                                className={`h-5 w-5 ${state.verifyRunId > 0 ? "check-drop text-green-600" : "text-slate-300"}`}
                                style={state.verifyRunId > 0 ? { animationDelay: `${Math.min(e.index * 80, 1200)}ms` } : undefined}
                                aria-label="Chain linkage verified"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center align-top">
                            {e.index > 0 && (
                              <button
                                type="button"
                                onClick={() => startMutation(e.index)}
                                disabled={!mutable}
                                title={
                                  mutable
                                    ? "Simulate Direct DB Mutation — edit this record payload without repairing downstream hashes"
                                    : chainBroken
                                    ? "System frozen for forensic audit"
                                    : "Block already under tamper treatment"
                                }
                                aria-label={`Simulate direct DB mutation on block #${e.index}`}
                                className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                                  mutable
                                    ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                                    : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                }`}
                              >
                                <Edit3 className="h-3 w-3" aria-hidden />
                                Simulate DB Mutation
                              </button>
                            )}
                          </td>
                        </tr>
                        {isEditing && (
                          <tr className="bg-amber-50">
                            <td colSpan={11} className="px-3 py-2.5">
                      <MutationEditor
                        initialBody={edit.body}
                        onSave={(body) => saveMutation(e.index, body)}
                        onCancel={() => setEdit(null)}
                      />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Fixed-width aside: the table column uses minmax(0,1fr) so the
            min-w table can never squeeze this into micro-columns. */}
        <aside className="flex w-full shrink-0 flex-col gap-4 self-start rounded-xl border border-navy-200 bg-white p-5 shadow-sm lg:sticky lg:top-40">
          <h3 className="border-b border-navy-100 pb-2 text-base font-semibold text-navy-950">
            How the SHA-256 chain works
          </h3>
          <ol className="space-y-4 text-xs leading-relaxed text-slate-600">
            {/* Each item is exactly two flex children — marker + one wrapped
                text block (min-w-0 flex-1) — so inline mono spans can never
                split the sentence into side-by-side micro-columns. */}
            <li className="flex gap-3">
              <span className="font-mono font-bold text-navy-700">1</span>
              <span className="min-w-0 flex-1 break-words">
                Each block stores{" "}
                <code className="break-words font-mono font-bold text-navy-800">hash = SHA-256(prevHash | index | action | actor | body | time)</code>{" "}
                — a cryptographic fingerprint of the entire history so far.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono font-bold text-navy-700">2</span>
              <span className="min-w-0 flex-1 break-words">
                The <code className="font-mono font-semibold">Prev Hash</code> column holds the <b>full 64-character</b> hash
                of the block above; the <code className="font-mono font-semibold">Block Hash</code> column is its own
                fingerprint.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono font-bold text-navy-700">3</span>
              <span className="min-w-0 flex-1 break-words">
                <b>Simulate Direct DB Mutation</b> on any sealed block rewrites its record payload in place and re-signs
                only that block — no downstream hash is repaired. Its hash changes, so the next block&apos;s{" "}
                <code className="font-mono font-semibold">Prev Hash</code> no longer matches, and every block after it is
                provably broken.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono font-bold text-navy-700">4</span>
              <span className="min-w-0 flex-1 break-words">
                <b>Restore Integrity / Re-seal</b> returns the original records, re-hashes the affected blocks, and the
                whole chain verifies clean again — exactly the recovery a forensic audit requires.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono font-bold text-navy-700">5</span>
              <span className="min-w-0 flex-1 break-words">
                Citizens connect to this same chain read-only from the public portal.
              </span>
            </li>
          </ol>
          <div className="rounded-md border border-navy-200 bg-navy-50 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Genesis (block 0)</div>
            <div className="mt-1 font-mono text-[10px] text-navy-800">
              <HashCell hash={state.ledger[0]?.hash ?? ""} />
            </div>
          </div>
        </aside>
      </div>

      {toast && <Toast message={toast.message} tone={toast.tone} />}

      <AuditCertLedger ledger={state.ledger} />
    </Shell>
  );
}

/** Inline editor opened by "Simulate Direct DB Mutation": edits the record
 *  payload (override reason / record text) plus, for blocks carrying the
 *  encoded amount/status tail, those two fields. Local state so amount and
 *  prose edits never clobber each other; saving routes through the attacker
 *  model — direct payload rewrite, own-hash-only re-seal. */
function MutationEditor({
  initialBody,
  onSave,
  onCancel,
}: {
  initialBody: string;
  onSave: (body: string) => void;
  onCancel: () => void;
}) {
  const [body, setBody] = useState(initialBody);
  const live = splitBody(body);
  const hasFields = live.amount !== null && live.status !== null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold uppercase tracking-wider text-navy-800">Simulate Direct DB Mutation</span>
        <span className="text-slate-500">
          Edits the stored payload directly and re-signs only this block&apos;s hash — downstream linkage breaks on
          the next integrity check, identically to an unauthorized database write.
        </span>
      </div>
      {hasFields && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1 font-semibold text-navy-800">
            Amount (₹L)
            <input
              type="number"
              min="0"
              step="0.01"
              value={formatAmount(live.amount ?? 0)}
              onChange={(ev) => {
                const amount = Number(ev.target.value);
                if (Number.isFinite(amount) && amount >= 0)
                  setBody(encodeBody(live.head, amount, live.status ?? "RECORDED"));
              }}
              className="w-24 rounded border border-navy-300 px-1.5 py-1 text-right font-mono text-xs text-navy-900 focus:border-navy-500 focus:outline-none"
              aria-label="Amount (lakh rupees)"
            />
          </label>
          <label className="flex items-center gap-1 font-semibold text-navy-800">
            Status
            <input
              type="text"
              value={live.status ?? ""}
              onChange={(ev) => {
                const status = ev.target.value.replace(/[₹|]+/g, "");
                setBody(encodeBody(live.head, live.amount ?? 0, status));
              }}
              className="w-32 rounded border border-navy-300 px-1.5 py-1 font-mono text-xs uppercase text-navy-900 focus:border-navy-500 focus:outline-none"
              aria-label="Status"
            />
          </label>
        </div>
      )}
      <textarea
        value={live.head}
        onChange={(ev) =>
          setBody(
            hasFields
              ? encodeBody(ev.target.value, live.amount ?? 0, live.status ?? "RECORDED")
              : ev.target.value
          )
        }
        rows={2}
        aria-label="Record payload (override reason)"
        className="w-full rounded border border-navy-300 px-2 py-1.5 font-mono text-xs leading-relaxed text-navy-900 focus:border-navy-500 focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSave(body)}
          className="rounded bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-500"
        >
          Execute Mutation (write &amp; re-seal)
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
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
      role="status"
      className={`toast-in fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-2 rounded-md border px-4 py-3 text-sm font-semibold shadow-lg ${
        tone === "ok" ? "border-green-300 bg-green-50 text-green-900" : "border-red-300 bg-red-50 text-red-900"
      }`}
    >
      {tone === "ok" ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      )}
      <span>{message}</span>
    </div>
  );
}

/**
 * Truncated SHA-256 display — `e3b0c442…8b5d` — with one-click copy of the
 * full hash. Fixed-width mono container: no `break-all` layout blowouts on
 * narrow screens; the full value lives on the title tooltip and clipboard.
 */
function HashCell({ hash, dim = false, highlight = false }: { hash: string; dim?: boolean; highlight?: boolean }) {
  const [copied, setCopied] = useState(false);
  if (!hash) return <span className="font-mono text-[9px] text-slate-400">—</span>;
  const short = `${hash.slice(0, 8)}…${hash.slice(-4)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (non-secure context) — tooltip still shows the hash */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={`${hash} — click to copy`}
      aria-label={`Copy hash ${short}`}
      className={`group inline-flex max-w-full items-center gap-1 rounded border border-transparent px-1 py-0.5 font-mono text-[10px] leading-tight transition hover:border-navy-300 hover:bg-white ${
        highlight ? "font-bold text-yellow-100" : dim ? "text-slate-500" : "text-navy-800"
      }`}
    >
      <span className="truncate">{short}</span>
      {copied ? (
        <CheckCircle2 className="h-3 w-3 shrink-0 text-green-600" aria-hidden />
      ) : (
        <Copy className="h-3 w-3 shrink-0 text-slate-400 opacity-0 group-hover:opacity-100" aria-hidden />
      )}
    </button>
  );
}
