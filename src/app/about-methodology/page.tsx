import type { Metadata } from "next";
import { DocPage } from "@/components/doc-page";

export const metadata: Metadata = {
  title: "About · Methodology & Limitations — MPLADS Sentinel",
  description:
    "How the MPLADS Sentinel demo works: seven scoring modules, weighted fusion, the Critical-Risk Gate, the SHA-256 ledger, and the limitations of synthetic demo data.",
};

const MODEL_TABLE: { module: string; type: string; detail: string }[] = [
  {
    module: "Trend of disbursal",
    type: "Statistics (rule)",
    detail: "Release pace vs the district's own 2015–2025 longitudinal series (3-year trailing average); falls back to a same-cohort peer snapshot when no series exists.",
  },
  {
    module: "Vendor duplicate",
    type: "Computation (rule)",
    detail: "thefuzz token-sort similarity recomputed live from both current titles at every evaluation, plus haversine distance from live coordinates. Deterministic — not ML.",
  },
  {
    module: "Cost variance",
    type: "Trained model",
    detail: "cost-gbr-v1 (GradientBoostingRegressor on log sanctioned cost; features: district, category, terrain, sanction year). Hold-out: MAE ₹4.11 L, R² 0.34. Per-case SHAP TreeExplainer attributions shown in the panel.",
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
    detail: "stall-lr-v1 (LogisticRegression; features: months since sanction, extensions, disbursal velocity, physical completion, category, live district stall rate). Hold-out: accuracy 0.87, ROC AUC 0.87. Trained on synthetic-label data (rule-derived labels, documented in backend/app/ml).",
  },
  {
    module: "Photo integrity",
    type: "Signal processing (rule)",
    detail: "pHash comparison with EXIF shown as supporting evidence only.",
  },
  {
    module: "Fusion (M8)",
    type: "Fixed weights (rule)",
    detail: "Transparent weighted sum — 28/20/20/10/8/7/7 — not a learned ensemble, so every composite is exactly reproducible by hand.",
  },
  {
    module: "Critical-Risk Gate (M9)",
    type: "Deterministic by design",
    detail: "A hard rule violation must never depend on model confidence: land tenure, entity type, safety certification, or a ≥ 99% pHash match forces HOLD regardless of any score. This is why a work can be held at a composite of 30/100.",
  },
];

const SOURCE_TABLE: { part: string; source: string }[] = [
  { part: "Demo cases, officials, vendors, photos, amounts", source: "Synthetic / fictional — flagged and held walkthrough cases use fictional MP names and work IDs." },
  { part: "Stall-classifier training rows (2,000)", source: "Synthetic with rule-derived labels + 4% noise; generator + rows committed under backend/app/ml/artifacts." },
  { part: "Cost-regressor training rows (~4,200) and trend series (2015–2025)", source: "Synthetic, calibrated to the published peer baselines. Real MoSPI-published works tables could not be vendored (aggregator requires sign-in; data.gov.in API requires a key) — the loader accepts a real CSV drop-in with no code changes (see backend/app/ml/data/SOURCES.md)." },
  { part: "Cost peer bands and baseline tiers", source: "Hand-set district/category/terrain baselines (demo constants); the trained regressor provides the expected value, the tiers provide the display band." },
  { part: "PFMS vendor directory", source: "Illustrative bundle — no live PFMS/GSTN/NIC lookup." },
];

export default function AboutMethodologyPage() {
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

      <section className="rounded-md border border-navy-200 bg-navy-50/50 p-4">
        <h2 className="text-sm font-bold text-navy-950">Scoring methodology</h2>
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
                <th className="px-3 py-2">Weight</th>
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
          The specific demo cases shown as flagged or held in the walkthrough remain clearly fictional
          (fictional MP names, fictional work IDs) even where the statistics they are compared against come
          from the training tables — no real, named, identifiable MP&apos;s project is ever shown under a
          risk or hold flag. Mock-mode cards start from static seed snapshots; the live API recomputes every score with the
          trained models. The district queue&apos;s &ldquo;↻ Sync live scores&rdquo; button pulls those live
          re-evaluations into the mock cards on demand (the badge flips from &ldquo;Seed snapshot
          scores&rdquo; to &ldquo;Live scores synced&rdquo;), and Live mode always shows backend-computed
          values — so the two modes can be brought into agreement at any time.
        </p>
      </section>

      <section className="rounded-md border border-navy-200 bg-navy-50/50 p-4">
        <h2 className="text-sm font-bold text-navy-950">Integrity & audit layers</h2>
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
        <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900">
          <li>All cases, officials, monuments, vendors and amounts are synthetic and for demonstration only; no real scheme or record is represented.</li>
          <li>Module weights and thresholds are illustrative starting points, not sanctioned policy parameters.</li>
          <li>PFMS matches use an illustrative vendor directory bundled in the demo — there is no live PFMS, GSTN, or NIC identity-data integration.</li>
          <li>Map positions are approximate stylizations, not authoritative survey coordinates.</li>
          <li>The scoring is not an audit or a legal determination; it is a monitoring aid for human decision-makers.</li>
        </ul>
      </section>
    </DocPage>
  );
}