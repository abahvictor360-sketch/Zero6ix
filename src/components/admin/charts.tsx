"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const LIME = "#9fd317";
const GREEN = "#177c4e";

export function RevenueChart({ data }: { data: { day: string; revenue: number }[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Revenue per day for the last 30 days">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }} tickLine={false} axisLine={false} width={56}
            tickFormatter={(v: number) => (v >= 1_000_000 ? `₦${(v / 1_000_000).toFixed(1)}m` : v >= 1000 ? `₦${Math.round(v / 1000)}k` : `₦${v}`)} />
          <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.05 }} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,.15)", color: "#0f172a" }}
            formatter={(v) => [`₦${Number(v).toLocaleString("en-NG")}`, "Revenue"]} />
          <Bar dataKey="revenue" fill={GREEN} radius={[6, 6, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusChart({ data }: { data: { status: string; count: number }[] }) {
  return (
    <div className="w-full" style={{ height: Math.max(160, data.length * 30) }} role="img" aria-label="Number of orders by status">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="status" width={100} tick={{ fontSize: 12, fill: "currentColor", opacity: 0.75 }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.05 }} contentStyle={{ borderRadius: 12, border: "none", color: "#0f172a" }} formatter={(v) => [v, "Orders"]} />
          <Bar dataKey="count" fill={LIME} radius={[0, 6, 6, 0]} maxBarSize={18} label={{ position: "right", fontSize: 11, fill: "currentColor" }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
