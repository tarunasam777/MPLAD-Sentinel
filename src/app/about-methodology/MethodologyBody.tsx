"use client";

import { useApp } from "@/store/AppStore";
import { DocPage } from "@/components/doc-page";

type ModelRow = { module: string; type: string; detail: string };

/**
 * Methodology body (client): renders the model table with metrics read LIVE
 * from the backend's trained artifacts (`GET /api/v1/ml/metrics`, surfaced
 * through the app store). Falls back to the last committed training run's
 * values when the API is unreachable, with an explicit badge saying which
 * source is in use — so the numbers can never silently drift after a retrain.
 */
export function MethodologyBody() {
  const { state } = useApp();
  const m = state.mlMetrics;

  const stallAcc = m ? m.stall.accuracy.toFixed(2) : "0.87";
  const stallAuc = m ? m.stall.roc_auc.toFixed(2) : "0.87";
  const stallRows = m ? m.stall.n_train.toLocaleString("en-IN") : "2,000";
  const costMae = m ? m.cost.mae_lakh.toFixed(2) : "4.11";
  const costR2 = m ? m.cost.r2_log.toFixed(2) : "0.34";
  const costRows = m ? m.cost.n_train.toLocaleString("en-IN") : "4,200";
  const stallVer = m ? m.stall.version : "stall-lr-v1";
  const costVer = m ? m.cost.version : "cost-xgb-v1";

  const MODEL_TABLE: ModelRow[] = [
    {
      module: "Trend of disbursal",
      type: "Statistics (rule)",
      detail:
        "Release pace vs the district's own 2015–2025 longitudinal series (3-year trailing average); falls back to a same-cohort peer snapshot when no series exists.",
    },
    {
      module: "Vendor duplicate",
      type: "Computation (rule)",
      detail:
        "thefuzz token-sort similarity recomputed live from both current titles at every evaluation, plus haversine distance from live coordinates. Deterministic — not ML.",
    },
    {
      module: "Cost variance",
      type: "Trained model",
      detail: `${costVer} (XGBRegressor on log sanctioned cost; features: district, category, terrain, sanction year). Hold-out: MAE ₹${costMae} L, R² ${costR2}. Trained on ${costRows} rows. Per-case SHAP TreeExplainer attributions shown in the panel.`,
    },
    {
      module: "Compliance guardrail",
      type: "Rules (deterministic)",
      detail: "Eligibility and documentation checks; critical failures also feed the hard gate.",
    },
    {
      module: "Payment integrity",
      type: "Rules + live lookup",
      detail: "Released-vs-completion arithmetic plus a live vendor/account match against the illustrative directory.",
    },
    {
      module: "Early-stall prediction",
      type: "Trained model",
      detail: `${stallVer} (LogisticRegression; features: months since sanction, extensions, disbursal velocity, physical completion, category, live district stall rate). Hold-out: accuracy ${stallAcc}, ROC AUC ${stallAuc}. Trained on ${stallRows} synthetic-label rows (rule-derived labels, documented in backend/app/ml).`,
    },
    {
      module: "Photo integrity",
      type: "Signal processing (rule)",
      detail: "pHash comparison with EXIF shown as supporting evidence only.",
    },
    {
      module: "Fusion (M8)",
      type: "Fixed weights (rule)",
      detail:
        "Transparent weighted sum — 28/20/20/10/8/7/7 — not a learned ensemble, so every composite is exactly reproducible by hand.",
    },
    {
      module: "Critical-Risk Gate (M9)",
      type: "Deterministic by design",
      detail:
        "A hard rule violation must never depend on model confidence: land tenure, entity type, safety certification, or a ≥ 99% pHash match forces HOLD regardless of any score. This is why a work can be held at a composite of 30/100.",
    },
  ];

  const SOURCE_TABLE: { part: string; source: string }[] = [
    {
      part: "MP allocation limits (543 Lok Sabha MPs)",
      source:
        "Official MoSPI “Allocated Limit for Hon'ble MPs” table — vendored verbatim at backend/app/data/mp_allocations_2025.csv, served from the database (/api/v1/mps/allocations), and re-verified row-by-row against the live eSAKSHI portal's own exports and national tiles (every LS money total matches to the paisa — see backend/app/data/worklevel/VALIDATION.md). The one fully real allocation dataset in the demo, now joined by real work-level exports in backend/app/data/{lok_shaba,rajya_sabha}/.",
    },
    {
      part: "Demo cases, officials, vendors, photos, amounts",
      source:
        "Synthetic / fictional. Every flagged, held or escalated work carries a demonstrably fictional MP and District Magistrate of record (“(Demo)” names that match no row of the official allocation table — enforced by regression tests), so no real person's name can appear under a risk flag.",
    },
    {
      part: "National scale-sample works",
      source:
        "Synthetic works anchored to the real allocation table: constituency, state and allocation limit are the published, checkable ones; the officials of record are fictional placeholders and rows are tagged “[Scale sample]”.",
    },
    {
      part: "Stall-classifier training rows",
      source: `Synthetic with rule-derived labels + 4% noise; generator + rows committed under backend/app/ml/artifacts (${stallRows} rows).`,
    },
    {
      part: "Cost-regressor training rows and trend series (2015–2025)",
      source: `Synthetic, calibrated to the published peer baselines (${costRows} rows). Real MoSPI-published works tables could not be vendored (aggregator requires sign-in; data.gov.in API requires a key) — the loader accepts a real CSV drop-in with no code changes (see backend/app/ml/data/SOURCES.md).`,
    },
    {
      part: "Cost peer bands and baseline tiers",
      source:
        "Hand-set district/category/terrain baselines (demo constants); the trained regressor provides the expected value, the tiers provide the display band.",
    },
    {
      part: "PFMS vendor directory",
      source: "Illustrative bundle — no live PFMS/GSTN/NIC lookup.",
    },
  ];

  return (
    <DocPage eyebrow="Government of India · MoSPI" title="About · Methodology & Limitations">
      <section className="rounded-md border border-navy-200 bg-navy-50/50 p-4">
        <h2 className="text-sm font-bold text-navy-950">What this is</h2>
        <p className="mt-1 text-slate-700">
          MPLADS Sentinel is a demonstration prototype that shows how AI-assisted monitoring could supervise
          Members of Parliament Local Area Development Scheme (MPLADS) works across a state — from the MP&apos;s
          recommendation to geo-tagged, photo-verified milestone disbursements. It renders risk composites, forces
          hard-gate holds, writes every decision to an immutable SHA-256 audit chain, and exposes an override-audit
          register for oversight. It is a UI/UX and engineering-concept demo, not a deployed government system.
        </p>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border-l-4 border-l-gate bg-amber-50/60 p-4">
          <h2 className="text-sm font-extrabold text-red-900">
            1 · The system refuses to let a strong composite average hide a critical violation
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            Risk is scored twice, deliberately. A weighted composite (module 8) ranks works, but a
            Critical-Risk Gate (module 9) can force a non-waivable HOLD on any mandatory guardrail
            violation — land tenure, entity type, safety certification, or a ≥ 99% photo match —
            regardless of the score. That is why a work can be held at a composite of 30/100, and why a
            gate release is always a recorded, audited Gate Override.
          </p>
        </div>
        <div className="rounded-md border-l-4 border-l-teal-600 bg-teal-50/50 p-4">
          <h2 className="text-sm font-extrabold text-teal-900">
            2 · Every flag carries SHAP or rule-based evidence a reviewing officer can act on
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            No module emits an unexplained number. Cost flags show per-case SHAP attributions from the
            trained regressor plus the peer band and baseline tier used; compliance flags cite the exact
            guideline clause and what failed; predictive flags list their leading indicators. A District
            Magistrate sees <i>why</i>, not just <i>how much</i>.
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-md border border-gov-gold/60 bg-amber-50/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-navy-950">Running on one fully real, verified dataset</h2>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-900">
            official MoSPI-published data · regression-tested
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">
          The official “Allocated Limit for Hon&apos;ble MPs” table — <b>all {state.analytics.mpAllocations.mpCount || 543} Lok Sabha
          MPs, ₹{(state.analytics.mpAllocations.totalCr || 8341.87).toLocaleString("en-IN", { maximumFractionDigits: 2 })} crore</b> — is
          vendored verbatim, seeded into the database,
          served at <code className="font-mono text-xs">/api/v1/mps/allocations</code>, and rendered on the MP desk and national
          dashboard — and <b>re-verified against the live eSAKSHI portal itself</b>: the portal&apos;s own work-level
          exports (109,625 recommended, 81,727 sanctioned, 35,648 completed works, 86,468 vendor payments — both
          houses) were downloaded and reconciled against this table and the portal&apos;s live national tiles —
          every money total agrees to the paisa (<code className="font-mono text-xs">backend/app/data/worklevel/VALIDATION.md</code>). It is the concrete proof this system runs on real
          published numbers, not only invented ones: every flagged work&apos;s <i>officials of record</i> are
          fictional (see the data policy below), but the allocation money anchoring the national view is
          checkable line by line, against the <i>live</i> portal, not just the PDF it came from.
        </p>
      </section>

      <section className="rounded-md border border-navy-200 bg-navy-50/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-navy-950">Scoring methodology</h2>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              m ? "bg-teal-100 text-teal-900" : "bg-amber-100 text-amber-900"
            }`}
          >
            {m ? "model metrics: LIVE from trained artifacts" : "model metrics: last committed training run"}
          </span>
        </div>
        <p className="mt-1 text-slate-700">
          Each sanctioned work is evaluated by seven independent modules (modules 1–7). Each module emits a
          deterministic sub-score from the stored case facts — the same facts always produce the same sub-score.
          Module 8 (fusion) then combines the sub-scores into a 0–100 composite using the published weights below.
        </p>
        <div className="mt-3 overflow-x-auto rounded-md border border-navy-200 bg-white">
          <table className="w-full min-w-[560px] border-collapse text-xs">
            <thead className="bg-navy-50 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2">Module</th>
                <th className="px-3 py-2">Key</th>
                <th className="px-3 py-2">What it scores</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {MODEL_TABLE.map((row) => (
                <tr key={row.module}>
                  <td className="px-3 py-2 font-semibold text-navy-900">{row.module}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        row.type.startsWith("Trained")
                          ? "bg-teal-100 text-teal-900"
                          : row.type.startsWith("Deterministic")
                          ? "bg-red-100 text-red-900"
                          : "bg-navy-100 text-navy-800"
                      }`}
                    >
                      {row.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-slate-700">
          Fusion weights are 8% trend, 20% duplicate, 20% cost, 28% compliance, 10% payment, 7%
          predictive and 7% photo. Module 9 (the Critical-Risk Gate) is deliberately separate: a
          high-confidence guardrail violation forces a HOLD independently of the composite score. That
          independence is exactly why a work can be held at a composite score of 30/100. Any gate release
          requires a recorded Gate Override; threshold overrides are tracked separately and treated as less severe.
        </p>
      </section>

      <section className="rounded-md border border-navy-200 bg-navy-50/50 p-4">
        <h2 className="text-sm font-bold text-navy-950">Data sources — what is real, what is synthetic</h2>
        <div className="mt-3 overflow-x-auto rounded-md border border-navy-200 bg-white">
          <table className="w-full min-w-[560px] border-collapse text-xs">
            <thead className="bg-navy-50 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2">System part</th>
                <th className="px-3 py-2">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {SOURCE_TABLE.map((row) => (
                <tr key={row.part}>
                  <td className="px-3 py-2 font-semibold text-navy-900">{row.part}</td>
                  <td className="px-3 py-2 text-slate-600">{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-slate-700">
          <b>Data policy (enforced, not just stated):</b> no real, named MP&apos;s project and no real,
          named official may ever appear under a risk flag — hold, escalation or override scrutiny.
          Every flagged row carries fictional officials of record verified against the official
          allocation table by automated tests (backend/tests/test_policy_mp_flags.py); real MP names
          appear only on clean, unflagged works and in the allocation register itself.
        </p>
        <p className="mt-2 text-slate-700">
          The specific demo cases shown as flagged or held in the walkthrough remain clearly fictional
          (fictional MP names, fictional work IDs) even where the statistics they are compared against come
          from the training tables. Mock-mode cards start from static seed snapshots; the live API recomputes every score with the
          trained models. The district queue&apos;s &ldquo;↻ Sync live scores&rdquo; button pulls those live
          re-evaluations into the mock cards on demand (the badge flips from &ldquo;Seed snapshot
          scores&rdquo; to &ldquo;Live scores synced&rdquo;), and Live mode always shows backend-computed
          values — so the two modes can be brought into agreement at any time.
        </p>
      </section>

      <section className="rounded-md border border-navy-200 bg-navy-50/50 p-4">
        <h2 className="text-sm font-bold text-navy-950">Integrity &amp; audit layers</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
          <li>
            <span className="font-semibold">SHA-256 ledger:</span> every action is a block chained to its
            predecessor&apos;s hash. The demo ships an inherited-tamper tool that proves corruption is detected
            instantly and the system freezes until restored.
          </li>
          <li>
            <span className="font-semibold">Photo verification:</span> perceptual hashing (pHash) compares stage
            photos; EXIF GPS/timestamp is shown as supporting evidence only, because it can be stripped or spoofed.
          </li>
          <li>
            <span className="font-semibold">Cost baseline cascade:</span> comparison baselines fall back from a
            district+category+terrain cluster to a district cohort, then to a state-level (category-wide) cohort,
            and finally to manual review — and the panel always states which tier was used.
          </li>
        </ul>
      </section>

      <section className="rounded-md border border-gate/30 bg-amber-50/60 p-4">
        <h2 className="text-sm font-bold text-red-900">Limitations (read before relying on this)</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900">          <li>
            Work-level demo cases, officials, vendors and amounts are synthetic and for demonstration only; no real scheme record is represented. The MP allocation table is the sole official dataset: it is used for allocation limits and national anchors only, and automated tests enforce that no real MP or DM name can appear on a flagged, held or escalated row.
          </li>
          <li>Module weights and thresholds are illustrative starting points, not sanctioned policy parameters.</li>
          <li>PFMS matches use an illustrative vendor directory bundled in the demo — there is no live PFMS, GSTN, or NIC identity-data integration.</li>
          <li>Map positions are approximate stylizations, not authoritative survey coordinates.</li>
          <li>The scoring is not an audit or a legal determination; it is a monitoring aid for human decision-makers.</li>
        </ul>
      </section>
    </DocPage>
  );
}
