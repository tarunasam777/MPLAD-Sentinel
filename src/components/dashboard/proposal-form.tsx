"use client";

import { useState } from "react";
import { Card, PrimaryButton, TextInput, SelectInput } from "@/components/ui";
import { DistrictMap } from "@/components/dashboard/district-map";
import { proposalCategories, proposalConstituencies, districts, mps } from "@/lib/data";
import { useApp } from "@/store/AppStore";

export function ProposalForm() {
  const { api } = useApp();
  const [title, setTitle] = useState("");
  const [hindiTitle, setHindiTitle] = useState("");
  const [category, setCategory] = useState(proposalCategories[0]);
  const [district, setDistrict] = useState(districts[1]);
  const [constituency, setConstituency] = useState(proposalConstituencies[0]);
  const [mpName, setMpName] = useState(mps[0]);
  const [amount, setAmount] = useState("40");
  const [scWorks, setScWorks] = useState("2");
  const [stWorks, setStWorks] = useState("1");
  const [generalWorks, setGeneralWorks] = useState("5");
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const sc = Number(scWorks) || 0;
  const st = Number(stWorks) || 0;
  const gen = Number(generalWorks) || 0;
  const total = sc + st + gen;

  const checker = {
    scPct: total > 0 ? (sc / total) * 100 : 0,
    stPct: total > 0 ? (st / total) * 100 : 0,
    scOk: total > 0 ? (sc / total) * 100 >= 15 : false,
    stOk: total > 0 ? (st / total) * 100 >= 7.5 : false,
  };

  const complete =
    title.trim().length > 4 && amount.length > 0 && loc !== null && checker.scOk && checker.stOk;

  const fireProposal = () => {
    if (!complete || !loc) return;
    api.submitProposal({
      title: title.trim(),
      hindiTitle: hindiTitle.trim() || title.trim(),
      category,
      district,
      constituency,
      mpName,
      sanctionedAmountLakh: Number(amount) || 0,
      reserved: { scWorks: sc, stWorks: st, generalWorks: gen },
      location: loc,
    });
    setSubmitted(true);
    setTitle("");
    setHindiTitle("");
    setLoc(null);
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-navy-950">New Formal Recommendation</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            MP → District Authority. Mandatory SC/ST reservation checker (15% SC / 7.5% ST of recommended works) is enforced below.
          </p>
        </div>
        <span className="rounded bg-navy-950 px-2 py-1 font-mono text-[10px] font-bold text-white">FORM · MPL-2025</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-[11px] font-semibold text-slate-600">Work title</label>
          <TextInput value={title} onChange={setTitle} placeholder="e.g. Solar-Powered Street Lighting, Ward 12…" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-600">हिंदी शीर्षक (hindi title)</label>
          <TextInput value={hindiTitle} onChange={setHindiTitle} placeholder="optional" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-600">Work category</label>
          <SelectInput
            value={category}
            onChange={setCategory}
            options={proposalCategories.map((c) => ({ value: c, label: c }))}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-600">Sanction amount (₹ lakh)</label>
          <TextInput value={amount} onChange={setAmount} placeholder="40" inputMode="numeric" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-600">District</label>
          <SelectInput
            value={district}
            onChange={setDistrict}
            options={districts.filter((d) => d !== "All districts").map((d) => ({ value: d, label: d }))}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-600">Constituency</label>
          <SelectInput
            value={constituency}
            onChange={setConstituency}
            options={proposalConstituencies.map((c) => ({ value: c, label: c }))}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-[11px] font-semibold text-slate-600">Recommending MP</label>
          <SelectInput value={mpName} onChange={setMpName} options={mps.map((m) => ({ value: m, label: m }))} />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[11px] font-semibold text-slate-600">
          Reserved-category allocation checker <span className="text-slate-400">(MPLADS Guideline ¶7.2 — floor 15% SC, 7.5% ST of total works)</span>
        </p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-600"># SC works</label>
            <TextInput value={scWorks} onChange={setScWorks} inputMode="numeric" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600"># ST works</label>
            <TextInput value={stWorks} onChange={setStWorks} inputMode="numeric" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600"># General works</label>
            <TextInput value={generalWorks} onChange={setGeneralWorks} inputMode="numeric" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold ${
              checker.scOk
                ? "border-green-300 bg-green-50 text-green-800"
                : "border-red-300 bg-red-50 text-red-700"
            }`}
          >
            {checker.scOk ? "✓" : "✕"} SC floor 15% — current {checker.scPct.toFixed(1)}%
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold ${
              checker.stOk
                ? "border-green-300 bg-green-50 text-green-800"
                : "border-red-300 bg-red-50 text-red-700"
            }`}
          >
            {checker.stOk ? "✓" : "✕"} ST floor 7.5% — current {checker.stPct.toFixed(1)}%
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-navy-200 bg-navy-50 px-2.5 py-1 text-xs font-semibold text-navy-800">
            Total works in proposal: {total}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[11px] font-semibold text-slate-600">
          Location pin <span className="text-slate-400">(click on map to fix geotag — stored for spatial duplicate check)</span>
        </p>
        <DistrictMap
          cases={[]}
          dropper
          dropperDot={loc}
          onDrop={setLoc}
          height={260}
          title={loc ? `Pinned: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : "Spatial index · drop a pin"}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <PrimaryButton onClick={fireProposal} disabled={!complete}>
          Submit to District Authority
        </PrimaryButton>
        {!complete && loc === null && (
          <span className="text-[11px] font-semibold text-amber-700">A geotag is required before submission.</span>
        )}
        {!complete && loc !== null && !checker.scOk && (
          <span className="text-[11px] font-semibold text-red-700">SC allocation must reach the 15% floor.</span>
        )}
        {!complete && loc !== null && checker.scOk && !checker.stOk && (
          <span className="text-[11px] font-semibold text-red-700">ST allocation must reach the 7.5% floor.</span>
        )}
      </div>

      {submitted && (
        <div className="mt-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-xs font-bold text-green-800 check-drop">
          ✓ Recommendation recorded to the SHA-256 audit ledger and routed to the District Authority for feasibility &amp; sanction.
        </div>
      )}
    </Card>
  );
}