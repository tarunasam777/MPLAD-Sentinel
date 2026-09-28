"use client";

function cellColor(v: number): string {
  if (v >= 80) return "bg-green-600 text-white";
  if (v >= 65) return "bg-green-400 text-green-950";
  if (v >= 50) return "bg-amber-300 text-amber-950";
  if (v >= 40) return "bg-amber-500 text-white";
  return "bg-red-600 text-white";
}

export function HeatmapGrid({
  rows,
  columns,
  cellKey,
}: {
  rows: { label: string; sub?: string }[];
  columns: { key: string; label: string }[];
  cellKey: (row: string, col: string) => number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="px-2 pb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500" />
            {columns.map((c) => (
              <th key={c.key} className="px-2 pb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="whitespace-nowrap px-2 py-1.5">
                <div className="text-xs font-semibold text-navy-900">{r.label}</div>
                {r.sub && <div className="text-[10px] text-slate-500">{r.sub}</div>}
              </td>
              {columns.map((c) => {
                const v = cellKey(r.label, c.key);
                if (v < 0) return <td key={c.key} className="px-2 py-1.5" />;
                return (
                  <td key={c.key} className="px-1 py-1">
                    <div
                      className={`flex min-w-[44px] items-center justify-center rounded px-2 py-1.5 text-center text-xs font-bold tabular-nums ${cellColor(v)}`}
                    >
                      {v}
                      <span className="ml-1 text-[9px] opacity-80">%</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NationalHeatmap({ data }: { data: { state: string; utilization: number; cases: number }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {data.map((d) => (
        <div
          key={d.state}
          className={`flex flex-col justify-between rounded-lg border p-3 ${cellColor(d.utilization)} border-transparent shadow-sm`}
        >
          <span className="text-xs font-bold leading-tight">{d.state}</span>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-xl font-extrabold tabular-nums">{d.utilization}%</span>
            <span className="text-[10px] opacity-80 tabular-nums">{d.cases} works</span>
          </div>
        </div>
      ))}
      <div className="col-span-full mt-1 flex items-center gap-3 text-[10px] text-slate-500">
        <span className="font-semibold uppercase tracking-wider">Legend:</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-green-600" /> ≥80</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-green-400" /> 65–79</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-300" /> 50–64</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> 40–49</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-600" /> &lt;40</span>
        <span className="ml-auto">Mean release pace of evaluated works per state (official allocation table coverage)</span>
      </div>
    </div>
  );
}