"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatKRW } from "@/lib/utils";

interface DailySalesChartProps {
  data: { date: string; current: number; previous: number }[];
}

export function DailySalesChart({ data }: DailySalesChartProps) {
  const hasPrev = data.some((d) => d.previous > 0);
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#f0f1f3" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(d) => String(d).slice(5)}
            axisLine={false}
            tickLine={false}
            minTickGap={20}
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
          {hasPrev && (
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              iconType="circle"
              iconSize={8}
            />
          )}
          <Bar dataKey="current" name="당기" fill="#0f172a" radius={[3, 3, 0, 0]} />
          {hasPrev && (
            <Bar
              dataKey="previous"
              name="전년 동일자"
              fill="#cbd5e1"
              radius={[3, 3, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
