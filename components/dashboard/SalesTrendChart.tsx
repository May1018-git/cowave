"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SITES } from "@/lib/sites";
import { formatKRW } from "@/lib/utils";
import type { SiteSeries } from "@/lib/types";

interface SalesTrendChartProps {
  series: SiteSeries[];
  previousYear?: SiteSeries[];
}

export function SalesTrendChart({ series, previousYear }: SalesTrendChartProps) {
  const buckets = new Set<string>();
  for (const s of series) for (const p of s.points) buckets.add(p.bucket);
  for (const s of previousYear ?? [])
    for (const p of s.points) buckets.add(p.bucket);
  const allBuckets = [...buckets].sort();

  const data = allBuckets.map((bucket) => {
    const row: Record<string, string | number | null> = { bucket };
    for (const s of series) {
      const point = s.points.find((p) => p.bucket === bucket);
      row[s.siteId] = point?.grossAmount ?? 0;
    }
    for (const s of previousYear ?? []) {
      const point = s.points.find((p) => p.bucket === bucket);
      // 전년 데이터가 없는 날은 null → 라인을 0으로 끌어내리지 않고 끊는다.
      row[`${s.siteId}_prev`] = point ? point.grossAmount : null;
    }
    return row;
  });

  const siteIds = series.map((s) => s.siteId);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#f0f1f3" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(b) => String(b).slice(5)}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(v) => formatKRW(Number(v), { compact: true })}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            formatter={(value) => formatKRW(Number(value))}
            labelStyle={{ color: "#374151", fontSize: 12 }}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          {siteIds.map((sid) => {
            const site = SITES.find((s) => s.id === sid);
            const color = sid === "all" ? "#0f172a" : site?.color ?? "#0f172a";
            const name = sid === "all" ? "전체" : site?.name ?? sid;
            return (
              <Line
                key={sid}
                type="monotone"
                dataKey={sid}
                name={name}
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            );
          })}
          {(previousYear ?? []).map((s) => {
            const site = SITES.find((x) => x.id === s.siteId);
            const color = s.siteId === "all" ? "#0f172a" : site?.color ?? "#0f172a";
            return (
              <Line
                key={`${s.siteId}_prev`}
                type="monotone"
                dataKey={`${s.siteId}_prev`}
                name={`${site?.name ?? s.siteId} (전년)`}
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                opacity={0.55}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
