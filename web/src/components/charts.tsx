"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const compact = (v: number) => (v >= 1e7 ? `₹${(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(1)}L` : v >= 1e3 ? `₹${Math.round(v / 1e3)}k` : `₹${v}`);

const BUCKET_COLORS = ["#94a3b8", "#f59e0b", "#f97316", "#dc2626", "#991b1b"];

export function AgeingChart({ data }: { data: { label: string; amount: number; count: number }[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Receivables ageing by bucket">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={56} />
          <Tooltip
            formatter={(v, _n, item) => [`${inr.format(Number(v))} · ${(item?.payload as { count: number }).count} invoice(s)`, "Outstanding"]}
            contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: "#e2e8f0" }}
          />
          <Bar dataKey="amount" radius={[3, 3, 0, 0]} maxBarSize={56}>
            {data.map((_, i) => (
              <Cell key={i} fill={BUCKET_COLORS[Math.min(i, BUCKET_COLORS.length - 1)]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBarChart({ data, color = "#0d9488" }: { data: { label: string; value: number }[]; color?: string }) {
  return (
    <div className="w-full" style={{ height: Math.max(120, data.length * 34 + 20) }} role="img" aria-label="Bar chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11, fill: "#334155" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => [inr.format(Number(v)), "Value"]} contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: "#e2e8f0" }} />
          <Bar dataKey="value" fill={color} radius={[0, 3, 3, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
