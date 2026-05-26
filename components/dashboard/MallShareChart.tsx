"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatKRW } from "@/lib/utils";
import type { MallBreakdownRow } from "@/lib/types";

const COLORS = ["#0f172a", "#1f6feb", "#ff6b35", "#10b981", "#f59e0b", "#a855f7"];

interface MallShareChartProps {
  rows: MallBreakdownRow[];
}

export function MallShareChart({ rows }: MallShareChartProps) {
  const data = rows.map((r) => ({
    name: r.mallName,
    value: r.grossAmount,
  }));

  return (
    <div className="flex h-72 items-center">
      <div className="h-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatKRW(Number(value))}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 space-y-2 pl-2 text-sm">
        {rows.map((r, i) => (
          <li key={r.mallId} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 truncate">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="truncate">{r.mallName}</span>
            </span>
            <span className="text-xs text-gray-500">
              {(r.share * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
