import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn, formatKRW, formatPercent } from "@/lib/utils";
import type { GrowthMetric } from "@/lib/types";

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  yoy?: GrowthMetric;
  mom?: GrowthMetric;
}

function formatDelta(delta: number): string {
  const sign = delta >= 0 ? "+" : "-";
  return `${sign}${formatKRW(Math.abs(delta), { compact: true })}원`;
}

function DeltaBadge({ label, metric }: { label: string; metric: GrowthMetric }) {
  const pct = metric.percent;
  const positive = (pct ?? 0) > 0.05;
  const negative = (pct ?? 0) < -0.05;
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium",
        positive && "bg-emerald-50 text-emerald-700",
        negative && "bg-red-50 text-red-700",
        !positive && !negative && "bg-gray-100 text-gray-600",
      )}
    >
      <Icon size={10} />
      <span className="text-gray-500">{label}</span>
      <span>{formatPercent(pct)}</span>
      <span className="opacity-70">({formatDelta(metric.delta)})</span>
    </span>
  );
}

export function KpiCard({ label, value, subValue, yoy, mom }: KpiCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium text-gray-500">{label}</div>
        <div className="flex flex-col items-end gap-1">
          {yoy && <DeltaBadge label="YoY" metric={yoy} />}
          {mom && <DeltaBadge label="MoM" metric={mom} />}
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {subValue && <div className="mt-1 text-xs text-gray-500">{subValue}</div>}
    </div>
  );
}
