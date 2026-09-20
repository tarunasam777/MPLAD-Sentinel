"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const chartPalette = ["#1b4775", "#14b8a6", "#d97706", "#dc2626", "#16a34a", "#8b5cf6", "#64748b"];

export function LineTrend({
  data,
  series,
}: {
  data: Record<string, string | number>[];
  series: { key: string; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -14, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e3e9f2" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickFormatter={(v: number) => `${v}%`}
          domain={[0, 100]}
        />
        <Tooltip formatter={(v: number | string) => [`${v}% release`, ""]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={2.5}
            dot={{ r: 2.5 }}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Donut({
  data,
  nameKey = "name",
}: {
  data: { name: string; value: number }[];
  nameKey?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey={nameKey}
          innerRadius={52}
          outerRadius={84}
          paddingAngle={2}
          strokeWidth={1}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={chartPalette[i % chartPalette.length]} />
          ))}
          <LabelList dataKey="name" position="outside" fontSize={10} fill="#475569" />
        </Pie>
        <Tooltip formatter={(v: number | string) => [`${v}%`, ""]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SpendBars({
  data,
}: {
  data: { category: string; releasesCr: number; sanctionsCr: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e3e9f2" />
        <XAxis
          dataKey="category"
          tick={{ fontSize: 10, fill: "#64748b" }}
          interval={0}
          angle={-22}
          textAnchor="end"
          height={56}
        />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v: number) => `₹${v} Cr`} />
        <Tooltip formatter={(v: number | string, name: string) => [`₹${v} Cr`, name === "releasesCr" ? "Releases" : "Sanctions"]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="sanctionsCr" fill="#1b4775" radius={[3, 3, 0, 0]} name="Sanctions" />
        <Bar dataKey="releasesCr" fill="#14b8a6" radius={[3, 3, 0, 0]} name="Releases" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OfficialsBar({
  data,
}: {
  data: { name: string; rate: number; gate: number; threshold: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 30, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e3e9f2" horizontal={false} />
        <XAxis type="number" domain={[0, "dataMax + 1"]} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v: number) => `${v}%`} />
        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "#334155" }} />
        <Tooltip formatter={(v: number | string, n: string) => [`${v}%`, n === "rate" ? "Override rate on high-risk" : n === "gate" ? "Gate overrides" : "Threshold overrides"]} />
        <Bar dataKey="rate" fill="#1b4775" radius={[0, 3, 3, 0]} name="rate" barSize={14} />
        <Bar dataKey="gate" fill="#dc2626" radius={[0, 3, 3, 0]} name="gate" barSize={14} />
        <Bar dataKey="threshold" fill="#d97706" radius={[0, 3, 3, 0]} name="threshold" barSize={14} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}