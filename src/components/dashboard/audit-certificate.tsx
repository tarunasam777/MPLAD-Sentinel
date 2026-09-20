"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Emblem } from "@/components/Header";
import { chainValidity } from "@/store/AppStore";
import { inrFull, inrWords, moduleMeta, officialStatus, scoreBand, statusLabel } from "@/lib/format";
import { sha256 } from "@/lib/sha256";
import type { LedgerEntry, ModuleKind, WorkCase } from "@/lib/types";

function useGeneratedAt(): string {
  const [ts, setTs] = useState("—");
  useEffect(() => {
    const id = window.setTimeout(() => {
      setTs(
        new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  return ts;
}

const TAMPER_MARKER = "⚠ DB-TAMPERED·AMOUNT/STATUS-ALTERED";

function AuditDoc({ children }: { children: ReactNode }) {
  return (
    <div id="print-doc" className="hidden print:block">
      <div className="mx-auto max-w-[820px] bg-white px-10 py-8 text-navy-950">
        {children}
      </div>
    </div>
  );
}

function CertHeader({ title, refNo, generatedAt }: { title: string; refNo: string; generatedAt: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-6 border-b-2 border-saffron pb-3">
        <div className="flex items-center gap-3">
          <Emblem size={52} />
          <div>
            <div className="text-[13px] font-extrabold uppercase tracking-widest text-navy-950">
              भारत सरकार · Government of India
            </div>
            <div className="text-[11px] font-semibold text-navy-800">
              Ministry of Statistics & Programme Implementation (MoSPI)
            </div>
            <div className="text-[10px] text-navy-600">National Informatics Centre (NIC) · MPLADS Sentinel Platform</div>
          </div>
        </div>
        <div className="text-right text-[10px] leading-relaxed text-navy-700">
          <div className="font-bold">Ref. No.: {refNo}</div>
          <div>Certificate generated: {generatedAt}</div>
          <div className="mt-1 inline-block border border-navy-900 px-2 py-0.5 font-bold tracking-widest">
            RESTRICTED · INTERNAL
          </div>
        </div>
      </div>
      <div className="border-b-2 border-gov py-3 text-center">
        <div className="text-lg font-black uppercase tracking-[0.18em] text-navy-950">{title}</div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-navy-600">
          Cryptographic audit memo · SHA-256 sealed
        </div>
      </div>
    </div>
  );
}

function CertSection({ no, title }: { no: string; title: string }) {
  return (
    <div className="mb-2 mt-6 flex items-center gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gov text-[11px] font-black text-white">
        {no}
      </span>
      <div className="text-[13px] font-extrabold uppercase tracking-wider text-navy-900">{title}</div>
      <div className="h-px flex-1 bg-navy-200" />
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="bg-white px-3 py-2">
      <div className="text-[9px] font-bold uppercase tracking-wider text-navy-500">{label}</div>
      <div className="mt-0.5 text-[11px] font-semibold text-navy-950">{value}</div>
    </div>
  );
}

function SealRow({ label, value, tone = "text-navy-900" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex gap-3 border-b border-navy-100 py-1.5 last:border-0">
      <div className="w-44 shrink-0 text-[10px] font-bold uppercase tracking-wider text-navy-500">{label}</div>
      <div className={`min-w-0 break-all font-mono text-[10px] leading-snug ${tone}`}>{value}</div>
    </div>
  );
}

function SignatureBlock({ sealSig }: { sealSig: string }) {
  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2">
      <div className="flex flex-col justify-between">
        <div className="text-[9px] font-bold uppercase tracking-wider text-navy-500">Authorised Signatory</div>
        <div>
          <div className="mt-7 border-t border-navy-400 pt-1 text-[11px] font-bold">Digitally signed · MoSPI Audit Wing</div>
          <div className="text-[9px] text-navy-600">National Informatics Centre · FY 2025–26</div>
        </div>
      </div>
      <div className="flex items-start justify-end">
        <div className="flex items-center gap-2 rounded-md border-2 border-dashed border-gov px-4 py-3">
          <span className="gov-barcode h-6 w-12 text-gov" aria-hidden />
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-navy-600">SHA-256 Certificate Seal</div>
            <div className="mt-0.5 break-all font-mono text-[9px] text-navy-900">{sealSig.slice(0, 40)}…</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CertFooter({ sealSig }: { sealSig: string }) {
  return (
    <div className="mt-5 border-t border-navy-300 pt-2 text-[9px] leading-relaxed text-navy-600">
      <div className="font-bold uppercase tracking-wider text-navy-800">
        MoSPI / NIC · MPLADS Sentinel · Integrity seal {sealSig.slice(0, 12)}…
      </div>
      <div className="mt-1">
        This certificate is a product of the Smart India Hackathon demo platform. No real scheme, funds or officials are
        involved — all records are synthetic and reset on refresh. Verify the full block hashes against the public
        citizen ledger to confirm chain integrity.
      </div>
    </div>
  );
}

function breakerStatus(c: WorkCase): string {
  if (c.gate.fired) return "⛔ TRIPPED · Module 9 Hard Gate FIRED";
  if (c.compositeScore >= 60 || c.status === "hold_active") return "⚠ TRIPPED · Module 8 Fusion Threshold HOLD";
  return "● LIVE · Circuit open, within tolerance";
}

const MODULE_ORDER: ModuleKind[] = ["trend", "duplicate", "cost", "compliance", "payment", "predictive", "photo"];

export function AuditCertCase({ c, ledger }: { c: WorkCase; ledger: LedgerEntry[] }) {
  const generatedAt = useGeneratedAt();
  const valid = chainValidity(ledger);
  const related = [...ledger].reverse().find((b) => b.caseId === c.id);
  const sealBlock = related ?? ledger[0];
  const sealBad = sealBlock ? !valid[sealBlock.index] && sealBlock.index > 0 : false;
  const sealSig = sealBlock
    ? sha256([c.id, c.district, c.mpName, String(c.sanctionedAmountLakh), String(c.compositeScore), sealBlock.hash].join("|"))
    : "";

  const ordered = MODULE_ORDER.map((m) => c.moduleBreakdown.find((b) => b.module === m)).filter(
    (b): b is NonNullable<typeof b> => Boolean(b)
  );

  return (
    <AuditDoc>
      <CertHeader
        title="Official Audit Certificate — Sanction Integrity"
        refNo={`MPL-SENT-AUD-${c.id}`}
        generatedAt={generatedAt}
      />

      <CertSection no="1" title="Case Metadata" />
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded border border-navy-300 bg-navy-200">
        <MetaField label="Work ID" value={<span className="font-mono">{c.id}</span>} />
        <MetaField label="District" value={`${c.district}, ${c.state}`} />
        <MetaField label="MP Name" value={c.mpName} />
        <MetaField label="Sanctioned Amount" value={`${inrWords(c.sanctionedAmountLakh)} (${inrFull(c.sanctionedAmountLakh)})`} />
        <MetaField label="Category" value={c.category} />
        <MetaField label="Constituency" value={c.constituency} />
        <MetaField label="Official Status" value={officialStatus[c.status]} />
        <MetaField label="Status (plain)" value={statusLabel[c.status]} />
        <MetaField label="Composite Score" value={`${c.compositeScore}/100`} />
      </div>

      <CertSection no="2" title="Risk Analysis — Module 1 to 9" />
      <table className="w-full border-collapse text-[11px] leading-snug">
        <thead>
          <tr className="border-b-2 border-navy-900 text-left">
            <th className="px-2 py-1.5 font-extrabold">Module</th>
            <th className="px-2 py-1.5 font-extrabold">Signal / Score</th>
            <th className="px-2 py-1.5 text-center font-extrabold">Weight</th>
            <th className="px-2 py-1.5 text-center font-extrabold">Risk Band</th>
            <th className="px-2 py-1.5 text-center font-extrabold">Status</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((b, i) => {
            const meta = moduleMeta[b.module];
            const flagged = b.triggered;
            return (
              <tr key={b.module} className="border-b border-navy-100">
                <td className="px-2 py-1.5">
                  <span className="font-extrabold text-navy-900">Module {i + 1}</span>
                  <span className="text-navy-700"> · {meta.name}</span>
                </td>
                <td className="px-2 py-1.5 font-mono text-navy-900">{b.subScore}/100</td>
                <td className="px-2 py-1.5 text-center font-mono text-navy-700">{Math.round(meta.weight * 100)}%</td>
                <td className="px-2 py-1.5 text-center text-navy-800">{scoreBand(b.subScore).toUpperCase()}</td>
                <td className={`px-2 py-1.5 text-center font-extrabold ${flagged ? "text-red-800" : "text-green-800"}`}>
                  {flagged ? "FLAGGED" : "PASS"}
                </td>
              </tr>
            );
          })}
          <tr className="border-b-2 border-navy-900 bg-navy-50/60 text-navy-900">
            <td className="px-2 py-1.5 font-extrabold">Module 8 · Fusion Threshold</td>
            <td className="px-2 py-1.5 font-mono">{c.compositeScore}/100 (≥ 60)</td>
            <td className="px-2 py-1.5 text-center font-mono">—</td>
            <td className="px-2 py-1.5 text-center">{c.compositeScore >= 60 || c.status === "hold_active" ? "HIGH" : "LOW"}</td>
            <td className={`px-2 py-1.5 text-center font-extrabold ${c.compositeScore >= 60 || c.status === "hold_active" ? "text-amber-800" : "text-green-800"}`}>
              {c.compositeScore >= 60 || c.status === "hold_active" ? "HOLD" : "PASS"}
            </td>
          </tr>
          <tr className="text-navy-900">
            <td className="px-2 py-1.5 font-extrabold">Module 9 · Critical-Risk Gate</td>
            <td className="px-2 py-1.5 font-mono">{c.gate.fired ? "FIRED" : "ARMED"}</td>
            <td className="px-2 py-1.5 text-center font-mono">hard</td>
            <td className="px-2 py-1.5 text-center">{c.gate.fired ? "HIGH" : "LOW"}</td>
            <td className={`px-2 py-1.5 text-center font-extrabold ${c.gate.fired ? "text-red-800" : "text-green-800"}`}>
              {c.gate.fired ? "VIOLATION" : "PASS"}
            </td>
          </tr>
        </tbody>
      </table>
      {c.gate.fired && (
        <div className="mt-2 rounded border border-red-700 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-900">
          ⛔ Hard-gate violation: {c.gate.rule}. This hold is independent of the composite score.
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-4 rounded border-2 border-gov px-3 py-2 text-[11px]">
        <span className="font-extrabold uppercase tracking-wider text-navy-900">Circuit Breaker Status</span>
        <span className="font-bold text-navy-800">{breakerStatus(c)}</span>
      </div>

      <CertSection no="3" title="SHA-256 Cryptographic Verification Seal" />
      <div className="rounded border border-navy-300 bg-navy-50/40 p-3">
        <SealRow
          label="Sealed block"
          value={sealBlock ? `BLOCK #${sealBlock.index} · ${sealBlock.action} · ${sealBlock.timestamp}` : "GENESIS ROOT"}
        />
        <SealRow label="Prev Hash" value={sealBlock ? sealBlock.prevHash : "—"} />
        <SealRow label="Block SHA-256" value={sealBlock ? sealBlock.hash : "—"} />
        <SealRow
          label="Memo signature"
          value={sealSig}
          tone={sealBad ? "text-red-800" : "text-green-800"}
        />
        <SealRow
          label="Integrity verdict"
          value={sealBad ? `INVALID — chain broken at block #${sealBlock?.index}` : "SEAL VERIFIED — hash chain intact"}
          tone={sealBad ? "text-red-800" : "text-green-800"}
        />
      </div>
      <p className="mt-2 text-[9px] leading-relaxed text-navy-600">
        The memo signature is SHA-256(Work ID | District | MP | Sanctioned Amount | Composite | Block Hash). Re-compute
        it with the public ledger to cryptographically prove this memo was not altered after the last chain write.
      </p>

      <SignatureBlock sealSig={sealSig} />
      <CertFooter sealSig={sealSig} />
    </AuditDoc>
  );
}

export function AuditCertLedger({ ledger }: { ledger: LedgerEntry[] }) {
  const generatedAt = useGeneratedAt();
  const valid = chainValidity(ledger);
  const firstBad = valid.findIndex((v) => !v);
  const broken = firstBad !== -1;
  const brokenCount = valid.filter((v) => !v).length;
  const tail = ledger[ledger.length - 1];
  const rootSig = ledger.length > 0 ? sha256(ledger.map((b) => b.hash).join("")) : "";

  const short = (s: string, n = 86) => (s.length > n ? `${s.slice(0, n)}…` : s);

  return (
    <AuditDoc>
      <CertHeader
        title="Ledger Integrity Audit Certificate"
        refNo={`MPL-SENT-LED-${tail ? tail.index : 0}-SHA256`}
        generatedAt={generatedAt}
      />

      <CertSection no="1" title="Ledger Metadata" />
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded border border-navy-300 bg-navy-200">
        <MetaField label="Blocks / Records" value={`${ledger.length} chained`} />
        <MetaField label="Genesis block" value={<span className="font-mono">{ledger[0]?.timestamp ?? "—"}</span>} />
        <MetaField label="Head block" value={<span className="font-mono">{tail?.timestamp ?? "—"}</span>} />
        <MetaField label="Jurisdiction" value="Telangana · FY 2025–26" />
        <MetaField label="Chain status" value={broken ? "CORRUPTED — FROZEN" : "CLEAN"} />
        <MetaField
          label="Corruption"
          value={broken ? `Block #${firstBad} + ${brokenCount} degraded link(s)` : "None detected"}
        />
      </div>

      <CertSection no="2" title="Block-by-Block Integrity Breakdown" />
      <table className="w-full border-collapse text-[10px] leading-snug">
        <thead>
          <tr className="border-b-2 border-navy-900 text-left">
            <th className="px-2 py-1.5 font-extrabold">Block</th>
            <th className="px-2 py-1.5 font-extrabold">Action</th>
            <th className="px-2 py-1.5 font-extrabold">Actor / Case</th>
            <th className="px-2 py-1.5 font-extrabold">Record</th>
            <th className="px-2 py-1.5 text-center font-extrabold">Status</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((e) => {
            const isTampered = e.body.includes(TAMPER_MARKER);
            const isBad = !valid[e.index] && e.index > 0;
            const core = isTampered ? e.body.replace(TAMPER_MARKER, "").trim() : e.body;
            return (
              <tr key={e.index} className="border-b border-navy-100 align-top">
                <td className="px-2 py-1.5 font-mono font-extrabold text-navy-900">#{e.index}</td>
                <td className="px-2 py-1.5">
                  <span className="font-bold uppercase text-navy-800">{e.action}</span>
                  <span className="text-navy-500"> ({e.category})</span>
                </td>
                <td className="px-2 py-1.5">
                  <div className="font-bold text-navy-900">{e.actor}</div>
                  <div className="font-mono text-navy-600">{e.caseId ?? "—"}</div>
                </td>
                <td className="max-w-[320px] px-2 py-1.5 text-navy-800">{short(core)}</td>
                <td
                  className={`px-2 py-1.5 text-center font-extrabold ${
                    isTampered ? "text-red-800" : isBad ? "text-red-800" : "text-green-800"
                  }`}
                >
                  {isTampered ? "TAMPERED" : isBad ? "CORRUPTED" : "VERIFIED"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <CertSection no="3" title="SHA-256 Block Verification Seal" />
      <div className="rounded border border-navy-300 bg-navy-50/40 p-3">
        <SealRow label="Genesis hash" value={ledger[0]?.hash ?? "—"} />
        <SealRow label="Head block hash" value={tail?.hash ?? "—"} />
        <SealRow
          label="Chain root signature"
          value={rootSig}
          tone={broken ? "text-red-800" : "text-green-800"}
        />
        <SealRow
          label="Integrity verdict"
          value={
            broken
              ? `INVALID — SHA-256 chain broken at block #${firstBad}; system frozen for forensic audit`
              : "SEAL VERIFIED — every block links cleanly"
          }
          tone={broken ? "text-red-800" : "text-green-800"}
        />
      </div>
      <p className="mt-2 text-[9px] leading-relaxed text-navy-600">
        Chain root signature = SHA-256 of all block hashes concatenated in order. Any database write after the genesis
        block re-seals its own hash and breaks every downstream Prev-Hash link — detectable exactly where shown above.
      </p>

      <SignatureBlock sealSig={rootSig} />
      <CertFooter sealSig={rootSig} />
    </AuditDoc>
  );
}