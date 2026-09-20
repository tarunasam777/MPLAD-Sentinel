"use client";

import { useMemo, useState } from "react";
import { Shell } from "@/components/shell";
import { useApp } from "@/store/AppStore";
import type { PfmsStage, WorkCase } from "@/lib/types";
import { Card, HelpNote, Pill, SectionTitle, SelectInput, TextInput, SecondaryButton } from "@/components/ui";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { ModeBanner } from "@/components/dashboard/ModeBanner";
import { StatusPill } from "@/components/dashboard/stepper";
import { inr, inrCompact, inrFull, stageLabel, officialStatus, officialStatusColor } from "@/lib/format";
import { PhotoVerifyInline, photoTargetFor, PhotoAlertBanner } from "@/components/dashboard/photo-verify";
import { caseGeo } from "@/lib/geo";

const BANK_NAMES = ["State Bank of India", "HDFC Bank", "Bank of Baroda", "Union Bank of India", "ICICI Bank", "Telangana Grameena Bank"];

const STAGES: PfmsStage[] = ["mobilization", "stage1", "stage2", "final"];

interface BankDetailsLocal {
  bank: string;
  account: string;
  ifsc: string;
  pan: string;
}

function vendorWorks(cases: WorkCase[]): WorkCase[] {
  return cases.filter(
    (c) => c.status === "released" || c.status === "auto_cleared" || c.status === "evaluating" || c.status === "override_approved"
  );
}

export default function VendorPage() {
  const { state, api } = useApp();
  const works = useMemo(() => vendorWorks(state.cases), [state.cases]);

  const [banks, setBanks] = useState<Record<string, BankDetailsLocal>>({});
  const [bankDraft, setBankDraft] = useState<Record<string, BankDetailsLocal>>({});
  const [disbStage, setDisbStage] = useState<Record<string, PfmsStage>>({});
  const [disbAmt, setDisbAmt] = useState<Record<string, string>>({});
  const [linked, setLinked] = useState<Record<string, string>>({});

  const myMilestones = state.milestones.filter((m) =>
    works.some((w) => w.id === m.workId)
  );

  const totalAssigned = works.reduce((a, c) => a + c.sanctionedAmountLakh, 0);

  const linkBank = (id: string) => {
    const d = bankDraft[id];
    if (!d || !d.account || !d.ifsc || d.ifsc.length < 6) return;
    setBanks((b) => ({ ...b, [id]: d }));
    setLinked((l) => ({ ...l, [id]: `PFMS receiver linked · ${d.bank} · …${d.account.slice(-4)}` }));
  };

  const fireDisbursement = (id: string) => {
    const amt = Number(disbAmt[id]);
    if (!amt || amt <= 0) return;
    api.requestDisbursement(id, disbStage[id] ?? "mobilization", amt);
    setDisbAmt((d) => ({ ...d, [id]: "" }));
  };

  return (
    <Shell active="home">
      <div className="mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-500">
          Implementing Agency (vendor) · execution portal
        </div>
        <h1 className="mt-1 text-2xl font-extrabold text-navy-950">Your assigned works &amp; stage requests</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Upload stage-progress photos (auto-verified for authenticity against district baselines), link your bank
          account for PFMS, and draw stage disbursements — each request is frozen into the SHA-256 audit chain and
          must be approved by the District Magistrate.
        </p>
      </div>

      <StatStrip
        items={[
          { label: "Assigned works", value: works.length, detail: `${inrCompact(totalAssigned)} under execution`, icon: <span aria-hidden>🏗️</span> },
          { label: "PFMS-linked accounts", value: Object.keys(linked).length, detail: "verified receiver accounts", accent: "text-teal-700" },
          { label: "Milestone requests", value: state.milestones.length, detail: "awaiting DM approval" },
          { label: "Disbursed to date", value: inr(totalAssigned * 0.38), detail: "FY 2025–26 PFMS releases" },
        ]}
      />

      <div className="mt-6">
        <ModeBanner />
      </div>

      <div className="space-y-4">
        {works.map((c) => {
          const bank = banks[c.id];
          const draft = bankDraft[c.id] ?? { bank: BANK_NAMES[0], account: "", ifsc: "", pan: "" };
          const smell = photoTargetFor(c);
          const geo = caseGeo(c, Number(c.id.replace(/[^\d]/g, "").slice(-2)) || 0);
          return (
            <Card key={c.id} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 bg-navy-50/50 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-500">{c.id}</span>
                    <Pill className={`${officialStatusColor[c.status]}`}>{officialStatus[c.status]}</Pill>
                    <StatusPill status={c.status} gateFired={c.gate.fired} />
                  </div>
                  <h3 className="mt-1 truncate text-sm font-extrabold text-navy-950">{c.title}</h3>
                  <p className="text-[11px] text-slate-500">
                    {c.district} · {c.constituency} · geotag {geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-extrabold tabular-nums text-navy-900">{inrFull(c.sanctionedAmountLakh)}</div>
                  <div className="text-[11px] text-slate-500">sanctioned {c.sanctionedDate}</div>
                </div>
              </div>

              <div className="grid gap-4 p-4 lg:grid-cols-3">
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">💳 PFMS bank link (Stage 0)</p>
                    <p className="text-[10px] italic leading-snug text-slate-500">
                      Illustrative — activates once PFMS-level identity data access is authorized; no live PFMS
                      lookup is performed here.
                    </p>
                    {bank && linked[c.id] ? (
                      <div className="mt-2 rounded-md border border-green-300 bg-green-50 px-3 py-2">
                        <p className="text-xs font-bold text-green-800">✓ {linked[c.id]}</p>
                        <p className="font-mono text-[10px] text-green-900">IFSC {bank.ifsc} · PAN {bank.pan || "—"}</p>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        <SelectInput
                          value={draft.bank}
                          onChange={(v) => setBankDraft((d) => ({ ...d, [c.id]: { ...draft, bank: v } }))}
                          options={BANK_NAMES.map((b) => ({ value: b, label: b }))}
                        />
                        <TextInput
                          value={draft.account}
                          onChange={(v) => setBankDraft((d) => ({ ...d, [c.id]: { ...draft, account: v } }))}
                          placeholder="Account number"
                          inputMode="numeric"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <TextInput
                            value={draft.ifsc}
                            onChange={(v) => setBankDraft((d) => ({ ...d, [c.id]: { ...draft, ifsc: v } }))}
                            placeholder="IFSC"
                          />
                          <TextInput
                            value={draft.pan}
                            onChange={(v) => setBankDraft((d) => ({ ...d, [c.id]: { ...draft, pan: v } }))}
                            placeholder="PAN"
                          />
                        </div>
                        <button
                          onClick={() => linkBank(c.id)}
                          disabled={!draft.account || draft.ifsc.length < 6}
                          className="w-full rounded-md bg-navy-900 px-3 py-2 text-xs font-bold text-white hover:bg-navy-800 disabled:opacity-50"
                        >
                          Link &amp; verify with PFMS
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">💰 Stage disbursement request</p>
                    <p className="text-[10px] italic leading-snug text-slate-500">
                      Demo: the request is frozen into the SHA-256 chain for the DM; no real PFMS settlement is triggered.
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <SelectInput
                        value={disbStage[c.id] ?? "mobilization"}
                        onChange={(v) => setDisbStage((d) => ({ ...d, [c.id]: v as PfmsStage }))}
                        options={STAGES.map((s) => ({ value: s, label: stageLabel[s] }))}
                      />
                      <TextInput
                        value={disbAmt[c.id] ?? ""}
                        onChange={(v) => setDisbAmt((d) => ({ ...d, [c.id]: v }))}
                        placeholder="₹ lakh"
                        inputMode="numeric"
                      />
                    </div>
                    <SecondaryButton
                      onClick={() => fireDisbursement(c.id)}
                      disabled={!(Number(disbAmt[c.id]) > 0) || !bank}
                      className="mt-2 w-full"
                    >
                      Request PFMS stage release
                    </SecondaryButton>
                    {!bank && <p className="mt-1 text-[10px] text-amber-700">Link a bank account first.</p>}
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <PhotoVerifyInline target={smell} compact />
                  {smell.forged && (
                    <div className="mt-3">
                      <PhotoAlertBanner matchPct={smell.forged ? 98.4 : 0} workId={c.id} small />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {works.length === 0 && (
          <Card className="p-8 text-center text-sm text-slate-500">
            No active executions assigned to this implementing agency in the demo dataset.
          </Card>
        )}
      </div>

      {myMilestones.length > 0 && (
        <div className="mt-6">
          <SectionTitle
            eyebrow="Track your requests"
            title="Disbursement milestone requests"
            subtitle="Submitted to the District Magistrate; approval releases funds via PFMS."
          />
          <Card className="mt-3 overflow-hidden">
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead className="border-b border-navy-200 bg-navy-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Work</th>
                  <th className="px-3 py-2 text-left">Stage</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Requested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {myMilestones.map((m) => (
                  <tr key={m.workId + m.stage}>
                    <td className="px-3 py-2 font-semibold text-navy-900">{m.workId}</td>
                    <td className="px-3 py-2 text-slate-600">{stageLabel[m.stage]}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums text-navy-900">{inr(m.amountLakh)}</td>
                    <td className="px-3 py-2">
                      {m.status === "approved" ? (
                        <Pill className="border-green-300 bg-green-50 text-green-800">✓ APPROVED — PFMS</Pill>
                      ) : (
                        <Pill className="border-amber-300 bg-amber-50 text-amber-900">Photo verification pending</Pill>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-500">{m.requestedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <HelpNote>
          Every photo you upload is hashed and matched against the baseline asset photo of the same geo-cluster
          (&lt;2 km) via <span className="font-mono">POST /api/v1/verify-photos</span>. A match ≥ 85% trips the Module 6
          hard gate and freezes the payment — the DM sees the exact same alert. Stage releases are appended to the
          immutable ledger before PFMS can settle funds. (Illustrative simulation — no live PFMS settlement occurs
          in this demo.)
        </HelpNote>
      </div>
    </Shell>
  );
}