"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { useApp } from "@/store/AppStore";
import { Card, ExportPdfButton, HelpNote, Pill, PrimaryButton, SectionTitle, SecondaryButton, TextInput } from "@/components/ui";
import { RadialGauge } from "@/components/dashboard/gauge";
import { StatusPill, Stepper } from "@/components/dashboard/stepper";
import { GateBanner } from "@/components/dashboard/gate-banner";
import { ExplainabilityPanel } from "@/components/modules/explainability";
import { ModuleCard } from "@/components/modules/module-card";
import { EvidencePanel } from "@/components/modules/evidence";
import { GateBadge } from "@/components/dashboard/risk";
import { AuthBanner } from "@/components/dashboard/AuthBanner";
import { inr } from "@/lib/format";
import { PhotoAlertBanner, PhotoVerifyInline, photoTargetFor } from "@/components/dashboard/photo-verify";
import { AuditCertCase } from "@/components/dashboard/audit-certificate";

type Decision = "approve" | "inspect" | "escalate" | null;

export default function CaseDetailPage() {
  return (
    <Suspense fallback={null}>
      <CaseDetailBody />
    </Suspense>
  );
}

function CaseDetailBody() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { state, api } = useApp();
  const [decision, setDecision] = useState<Decision>(null);
  const [note, setNote] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const fromParam = searchParams.get("from");
  const from =
    fromParam === "mp" || fromParam === "state" || fromParam === "ministry" || fromParam === "ledger" || fromParam === "vendor"
      ? fromParam
      : "district";

  const c = state.cases.find((x) => x.id === params.id);
  if (!c) {
    return (
      <Shell active="case">
        <Card className="p-10 text-center">
          <div className="text-lg font-bold text-navy-950">Case not found</div>
          <p className="mt-1 text-sm text-slate-500">{params.id} is not in the demo queue.</p>
          <Link href="/dashboard/district" className="mt-4 inline-block rounded-md bg-navy-900 px-4 py-2 text-sm font-bold text-white">
            Back to district queue
          </Link>
        </Card>
      </Shell>
    );
  }

  const isDm = state.role === "district";
  const canAct = isDm && c.status === "hold_active";
  const flaggedModules = c.moduleBreakdown.filter((m) => m.triggered);
  const backHref =
    from === "mp"
      ? "/dashboard/mp"
      : from === "state"
      ? "/dashboard/state"
      : from === "ministry"
      ? "/dashboard/ministry"
      : from === "vendor"
      ? "/dashboard/vendor"
      : "/dashboard/district";

  const gatePill = c.gate.fired ? <GateBadge /> : null;

  const submit = () => {
    if (!decision) return;
    api.decideCase(c.id, decision, note.trim());
    setDecision(null);
    setNote("");
  };

  return (
    <Shell active="case">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href={backHref} className="rounded-md border border-navy-300 bg-white px-3 py-1.5 text-xs font-bold text-navy-800 transition hover:bg-navy-50">
          ← Back to {from === "mp" ? "my works" : from === "state" ? "state view" : from === "ministry" ? "ministry view" : from === "vendor" ? "agency portal" : "district queue"}
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ExportPdfButton onClick={() => window.print()}>Export Official Audit Certificate (PDF)</ExportPdfButton>
          <span className="font-mono text-xs text-slate-500">{c.id}</span>
          {gatePill}
          <StatusPill status={c.status} gateFired={c.gate.fired} />
        </div>
      </div>

      {/* Header */}
      <Card className="mb-5 p-5">
        <div className="flex flex-wrap gap-6">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-500">{c.category}</div>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight text-navy-950">{c.title}</h1>
            <div className="mt-1 text-sm text-slate-500">{c.hindiTitle}</div>
            {isDm &&
              (editingTitle ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="min-w-[240px] flex-1">
                    <TextInput
                      value={titleDraft}
                      onChange={setTitleDraft}
                      placeholder="Revised work description…"
                    />
                  </div>
                  <SecondaryButton
                    onClick={() => {
                      api.updateCaseTitle(c.id, titleDraft);
                      setEditingTitle(false);
                    }}
                  >
                    Re-score live
                  </SecondaryButton>
                  <SecondaryButton onClick={() => setEditingTitle(false)}>Cancel</SecondaryButton>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setTitleDraft(c.title);
                    setEditingTitle(true);
                  }}
                  className="mt-1 text-[11px] font-semibold text-navy-600 underline-offset-2 hover:underline"
                >
                  ✎ Revise work description (duplicate check re-scores live)
                </button>
              ))}

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">District</dt>
                <dd className="font-semibold text-navy-900">{c.district} · {c.state}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">MP</dt>
                <dd className="font-semibold text-navy-900">{c.mpName}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Sanctioned</dt>
                <dd className="font-extrabold tabular-nums text-navy-900">{inr(c.sanctionedAmountLakh)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Sanctioned on</dt>
                <dd className="font-semibold text-navy-900">{c.sanctionedDate}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status since</dt>
                <dd className="font-semibold text-navy-900">{c.statusSince}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">District officer</dt>
                <dd className="font-semibold text-navy-900">DM {c.dmName}</dd>
              </div>
            </dl>

            <p className="mt-4 max-w-3xl rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-xs leading-relaxed text-navy-900">
              {c.overview}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-2">
            <RadialGauge score={c.compositeScore} gateFired={c.gate.fired} />
            <span className="text-[11px] text-slate-500">fusion of 7 modules · demo</span>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Lifecycle path — highlighted = this case&apos;s actual route
          </div>
          <Stepper path={c.path} />
        </div>
      </Card>

      {/* Banners: Module 9 Hard Gate vs Module 8 Fusion Threshold */}
      {c.gate.fired ? (
        <div className="mb-5">
          <GateBanner c={c} />
        </div>
      ) : (c.compositeScore >= 60 || c.status === "hold_active") ? (
        <div className="mb-5 rounded-lg border-2 border-amber-500 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-sm font-black text-white">
              ⚡
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                  Module 8 · Fusion Threshold Hold Active
                </span>
                <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                  Composite Score {c.compositeScore}/100 (Threshold ≥ 60)
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-950">
                This case is held because its transparent weighted risk composite exceeded operational tolerance. Unlike Module 9 hard gates, this is an aggregate statistical signal driven by multiple contributing risk factors.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* PFMS Vendor Reconciliation Quick Card */}
      {(() => {
        const f = c.facts?.pfms;
        if (!f || typeof f !== "object") return null;
        const pfms = f as {
          stage_number?: number;
          stage1_account?: string;
          target_account?: string;
          vendor_gstin?: string;
          vendor_name?: string;
        };
        const redirect = pfms.target_account !== pfms.stage1_account;
        return (
          <div className="mb-5 rounded-lg border border-indigo-200 bg-indigo-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-900">
                  PFMS · Vendor Disbursement Reconciliation
                </span>
                <span className="rounded bg-indigo-200 px-1.5 py-0.5 text-[10px] font-bold text-indigo-900">
                  Stage #{pfms.stage_number ?? 2}
                </span>
              </div>
              {redirect ? (
                <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-700">
                  ⚠ FUND REDIRECTION ALERT
                </span>
              ) : (
                <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-extrabold text-green-700">
                  ✓ SNA Account Matched
                </span>
              )}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded bg-white p-2.5 border border-indigo-100">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Registered Vendor</div>
                <div className="mt-0.5 font-bold text-navy-950">{pfms.vendor_name ?? "Implementing Agency"}</div>
                <div className="mt-0.5 font-mono text-[10px] text-slate-500">GSTIN: {pfms.vendor_gstin ?? "N/A"}</div>
              </div>
              <div className="rounded bg-white p-2.5 border border-indigo-100">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Stage 1 Account</div>
                <div className="mt-0.5 font-mono font-bold text-navy-950">{pfms.stage1_account ?? "SBIN00014239871"}</div>
                <div className="mt-0.5 text-[10px] text-green-700 font-semibold">Registered Single Nodal Account</div>
              </div>
              <div className="rounded bg-white p-2.5 border border-indigo-100">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Stage 2 Destination Account</div>
                <div className="mt-0.5 font-mono font-bold text-navy-950">{pfms.target_account ?? "HDFC00098471204"}</div>
                {redirect ? (
                  <div className="mt-0.5 text-[10px] text-red-700 font-bold">Changed without logged re-binding</div>
                ) : (
                  <div className="mt-0.5 text-[10px] text-green-700 font-semibold">Consistent destination</div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Module 6 · contextual photo verification */}
      <div className="mb-6">
        <div className="mb-2">
          <SectionTitle
            eyebrow="Stage-milestone evidence"
            title="Module 6 · photo integrity workflow"
            subtitle="A stage photo uploaded for this work is hashed in-browser and auto-verified against the district asset baseline — the same check that froze forged submissions in the queue."
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <PhotoVerifyInline target={photoTargetFor(c)} />
          <div className="space-y-3">
            {photoTargetFor(c).forged ? (
              <PhotoAlertBanner matchPct={photoTargetFor(c).forged ? 98.4 : 0} workId={c.id} />
            ) : (
              <Card className="p-4">
                <p className="text-xs font-bold text-green-800">✓ Baseline clean — no photo gate history</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  District baseline pHash for {c.district} loaded. Upload a stage photo to run a live
                  perceptual-hash + EXIF comparison and open the hash-sheet modal.
                </p>
              </Card>
            )}
            <HelpNote>
              Matches ≥ 85% trip the Module 6 hard gate and block release. Photos shot from phones (stripped EXIF)
              are treated as missing corroboration, not as proof of tampering.
            </HelpNote>
          </div>
        </div>
      </div>

      {/* Module breakdown */}
      <div className="mb-2">
        <SectionTitle
          eyebrow="Detection modules"
          title="Module breakdown"
          subtitle="Each module scores 0–100 on its own signal. A low (red) sub-score contributes to the fusion; a FLAGGED badge means that module raised the alert that got this case attention."
        />
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {c.moduleBreakdown.map((m) => (
          <ModuleCard key={m.module} m={m} />
        ))}
      </div>

      {/* Evidence */}
      {flaggedModules.length > 0 && (
        <div className="mb-6">
          <SectionTitle
            eyebrow="Evidence"
            title="Evidence panels for flagged modules"
            subtitle="The captured artefacts behind the alert — module-specific on purpose"
          />
          <div className="mt-3 space-y-3">
            {flaggedModules.map((m) =>
              m.evidence ? (
                <EvidencePanel
                  key={m.module}
                  module={m}
                  liveTitle={m.module === "duplicate" ? c.title : undefined}
                />
              ) : (
                <Card key={m.module} className="border-l-4 border-l-navy-700 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-navy-700">
                    Evidence · {m.module === "payment" ? "Payment Efficiency" : m.module === "cost" ? "Cost & Delay" : m.module}
                  </div>
                  <p className="mt-1.5 text-sm text-navy-900">{m.description}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    No dedicated visualisation in this build for this module — the sub-score and narrative above
                    are the record.
                  </p>
                </Card>
              )
            )}
          </div>
        </div>
      )}

      {/* Explainability */}
      <div className="mb-6">
        <ExplainabilityPanel c={c} />
      </div>

      {/* Actions (DM only, held cases only) */}
      {canAct && (
        <Card className={`p-5 ${c.gate.fired ? "border-2 border-gate" : ""}`}>
          <div className="mb-3">
            <AuthBanner />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-navy-950">District decision</span>
            <Pill className="border-navy-300 bg-navy-50 text-navy-700">you are the District Magistrate</Pill>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {c.gate.fired
              ? "This work is held by the Critical-Risk Gate. Any approval below is recorded as a GATE OVERRIDE and is flagged as a serious action in the override-audit register."
              : "This work is held by the composite score (threshold hold). An approval is recorded as a Threshold Override in the ledger and the override-audit register."}
          </p>

          {c.gate.fired && (
            <div className="mt-3 rounded-md border border-gate bg-red-50 px-3 py-2 text-xs font-semibold text-gate">
              ⚠ Approving overrides a hard rule violation — do this only after physical verification.
            </div>
          )}

          {!decision ? (
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                onClick={() => setDecision("approve")}
                className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-800"
              >
                Approve & Release
              </button>
              <button
                onClick={() => setDecision("inspect")}
                className="inline-flex items-center gap-2 rounded-md border border-amber-600 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900 transition hover:bg-amber-100"
              >
                Hold for Inspection
              </button>
              <button
                onClick={() => setDecision("escalate")}
                className="inline-flex items-center gap-2 rounded-md border border-red-700 bg-red-50 px-4 py-2 text-sm font-bold text-red-800 transition hover:bg-red-100"
              >
                Escalate to Audit
              </button>
            </div>
          ) : (
            <div className="mt-4 max-w-2xl rounded-md border border-navy-200 bg-navy-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-navy-700">
                {decision === "approve" ? "Record approval decision" : decision === "inspect" ? "Record inspection order" : "Record escalation"}
              </div>
              <div className="mt-2">
                <TextInput
                  rows={2}
                  value={note}
                  onChange={setNote}
                  placeholder={
                    decision === "approve"
                      ? "Justification (written to the ledger): e.g. 'Physical verification completed; rule condition satisfied.'"
                      : decision === "inspect"
                      ? "Instructions for the inspection team…"
                      : "Reason for audit escalation…"
                  }
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <PrimaryButton onClick={submit}>Confirm & log to ledger</PrimaryButton>
                <SecondaryButton onClick={() => setDecision(null)}>Cancel</SecondaryButton>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                On confirm: a block is appended to the hash-chained ledger and the override register updates.
              </p>
            </div>
          )}
        </Card>
      )}

      {!isDm && (
        <HelpNote>
          Decision controls are hidden — in this demo only the <b>District Magistrate</b> role can act on a held
          case. Switch roles via the top bar to try Approve / Inspect / Escalate.
        </HelpNote>
      )}

      <div className="mt-4 text-[11px] text-slate-400">
        Safe to demo: refreshing the page resets every action. All data is synthetic.
      </div>

      {state.lastAction && <Toast message={state.lastAction} />}

      <AuditCertCase c={c} ledger={state.ledger} />
    </Shell>
  );
}

function Toast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), 4500);
    return () => window.clearTimeout(t);
  }, [message]);
  if (!visible) return null;
  return (
    <div className="toast-in fixed bottom-5 right-5 z-50 max-w-sm rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900 shadow-lg">
      <span className="mr-1.5 text-green-700">✓</span>
      {message}
    </div>
  );
}