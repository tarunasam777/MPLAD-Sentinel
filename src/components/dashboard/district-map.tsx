"use client";

import { useMemo, useState } from "react";
import { caseGeo, districtCenters, toApprox } from "@/lib/geo";
import { statusLabel } from "@/lib/format";
import type { WorkCase } from "@/lib/types";

export interface MapProject {
  id: string;
  title: string;
  district: string;
  status: WorkCase["status"];
  gate: boolean;
  score: number;
  lat: number;
  lng: number;
}

const DISTRICTS_RENDER: { name: string; lat: number; lng: number }[] = Object.entries(districtCenters).map(
  ([name, v]) => ({ name, ...v })
);

const pinch: Record<string, { x: number; y: number }> = {};
for (const d of DISTRICTS_RENDER) {
  pinch[d.name] = { x: ((d.lng - 77.55) / 1.9) * 100, y: ((d.lat - 16.45) / 1.75) * 100 };
}

function pinColor(status: WorkCase["status"], gate: boolean, score: number): string {
  if (gate) return "url(#gateGrad)";
  if (status === "released" || status === "auto_cleared") return "url(#okGrad)";
  if (score >= 70) return "url(#gateGrad)";
  if (score >= 40) return "url(#warnGrad)";
  return "url(#okGrad)";
}

function ProjectPin({
  p,
  selected,
  border,
  onSelect,
  onHover,
}: {
  p: MapProject;
  selected: boolean;
  border: string;
  onSelect?: (id: string) => void;
  onHover?: (p: MapProject | null) => void;
}) {
  const fill = pinColor(p.status, p.gate, p.score);
  const x = ((p.lng - 77.55) / 1.9) * 100;
  const y = ((p.lat - 16.45) / 1.75) * 100;
  const pulse = p.gate || p.score >= 70;
  return (
    <g
      transform={`translate(${x} ${y})`}
      onClick={() => onSelect?.(p.id)}
      onMouseEnter={() => onHover?.(p)}
      onMouseLeave={() => onHover?.(null)}
      style={{ cursor: onSelect ? "pointer" : "default" }}
    >
      {pulse && <circle r={14} fill="none" stroke="#dc2626" strokeWidth="0.6" className="gate-pulse" />}
      <circle r={7.5} fill="#f8fafc" stroke="#0c2440" strokeWidth="1.4" />
      <circle r={4.8} fill={fill} stroke={border} strokeWidth="0.8" />
      {selected && <circle r={11} fill="none" stroke="#d2a24c" strokeWidth="1.6" />}
      <title>
        {p.id} · {p.title.slice(0, 60)}··· — {statusLabel[p.status]}
        {p.gate ? " · GATE HELD" : ""}
      </title>
    </g>
  );
}

export function DistrictMap({
  cases,
  selectedId = null,
  onSelect,
  dropper = false,
  dropperDot,
  onDrop,
  height = 420,
  title = "Spatial index · PostGIS / geohash overlay",
}: {
  cases: WorkCase[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  dropper?: boolean;
  dropperDot?: { lat: number; lng: number } | null;
  onDrop?: (pos: { lat: number; lng: number }) => void;
  height?: number;
  title?: string;
}) {
  const [hover, setHover] = useState<MapProject | null>(null);

  const projects = useMemo<MapProject[]>(
    () =>
      cases.map((c, i) => {
        const g = caseGeo(c, i);
        return {
          id: c.id,
          title: c.title,
          district: c.district,
          status: c.status,
          gate: c.gate.fired,
          score: c.compositeScore,
          lat: g.lat,
          lng: g.lng,
        };
      }),
    [cases]
  );

  const px = (lat: number, lng: number) => ({
    x: ((lng - 77.55) / 1.9) * 100,
    y: ((lat - 16.45) / 1.75) * 100,
  });

  const onSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dropper || !onDrop) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onDrop(toApprox(x, y));
  };

  return (
    <div className="overflow-hidden rounded-lg border border-navy-200 bg-[#eef3f8]">
      <div className="flex items-center justify-between border-b border-navy-200 bg-navy-900 px-3 py-2">
        <span className="text-[11px] font-bold text-white">{title}</span>
        {dropper ? (
          <span className="text-[10px] font-semibold text-gov-gold">{dropperDot ? "pin set" : "click map to drop a pin"}</span>
        ) : (
          <span className="flex items-center gap-1 font-mono text-[10px] text-navy-200">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" /> 17.38N · 78.49E
          </span>
        )}
      </div>
      <div className="relative">
        <svg viewBox="0 0 100 100" className="h-auto w-full" onClick={onSvgClick} style={{ width: "100%", height: `${height}px` }}>
          <defs>
            <linearGradient id="okGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#16a34a" />
              <stop offset="1" stopColor="#0f766e" />
            </linearGradient>
            <linearGradient id="warnGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f59e0b" />
              <stop offset="1" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="gateGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#dc2626" />
              <stop offset="1" stopColor="#b42318" />
            </linearGradient>
          </defs>

          <rect x="2" y="2" width="96" height="96" fill="#dbe7f0" stroke="#b9ceec" strokeWidth="0.4" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g key={`gx${i}`} stroke="#b9ceec" strokeWidth="0.18">
              <line x1={5 + i * 18} y1="2" x2={5 + i * 18} y2="98" />
              <line x1="2" y1={5 + i * 18} x2="98" y2={5 + i * 18} />
            </g>
          ))}

          <path
            d="M22 8 L34 4 L50 6 L68 4 L82 10 L92 24 L96 44 L94 66 L88 84 L72 96 L52 98 L34 94 L18 86 L8 68 L6 46 L10 26 Z"
            fill="rgba(255,255,255,0.65)"
            stroke="#1b4775"
            strokeWidth="0.7"
          />

          {DISTRICTS_RENDER.map((d) => (
            <g key={`lab-${d.name}`}>
              <text
                x={pinch[d.name].x}
                y={pinch[d.name].y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="2.6"
                fontWeight="700"
                fill="#143560"
                paintOrder="stroke"
                stroke="#ffffff"
                strokeWidth="0.5"
              >
                {d.name === "Medchal-Malkajgiri" ? "Medchal" : d.name}
              </text>
            </g>
          ))}

          {projects.map((p) => (
            <ProjectPin
              key={p.id}
              p={p}
              selected={selectedId === p.id}
              border={selectedId === p.id ? "#0c2440" : "#ffffff"}
              onSelect={onSelect}
              onHover={setHover}
            />
          ))}

          {dropperDot && dropper && (
            <g transform={`translate(${px(dropperDot.lat, dropperDot.lng).x} ${px(dropperDot.lat, dropperDot.lng).y})`}>
              <circle r={13} fill="none" stroke="#0f766e" strokeWidth="0.9" className="gate-pulse" />
              <circle r={5.5} fill="url(#okGrad)" stroke="#0c2440" strokeWidth="0.8" />
            </g>
          )}

          <g>
            <line x1="80" y1="8" x2="80" y2="4" stroke="#0c2440" strokeWidth="0.5" />
            <polygon points="80,2.4 79.2,5.4 80.8,5.4" fill="#0c2440" />
            <text x="78" y="11.5" fontSize="2.2" fontWeight="700" fill="#0c2440">N</text>
          </g>

          <g>
            <line x1="4" y1="94" x2="18" y2="94" stroke="#0c2440" strokeWidth="0.8" />
            <text x="4" y="97.2" fontSize="1.9" fill="#334155">20 km</text>
          </g>
        </svg>

        {hover && (
          <div className="pointer-events-none absolute bottom-2 left-2 z-10 max-w-[240px] rounded-md border border-navy-200 bg-white px-2.5 py-1.5 text-[11px] shadow-lg">
            <span className="font-mono font-bold text-navy-900">{hover.id}</span>
            <span className="ml-1 text-slate-500">· {hover.district}</span>
            <div className="truncate text-slate-700">{hover.title}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function dropperProjectRate(c: WorkCase): string {
  const g = caseGeo(c, Number(c.id.replace(/[^\d]/g, "").slice(-2)) || 0);
  return `${g.lat.toFixed(4)}, ${g.lng.toFixed(4)}`;
}