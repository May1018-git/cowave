import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { PeriodToggle } from "@/components/sales/PeriodToggle";
import { CategoryStackChart } from "@/components/sales/CategoryStackChart";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";
import {
  getKpis,
  getSeries,
  getSubCategoryBreakdown,
  resolveRange,
} from "@/lib/data-source";
import {
  previousPeriodMoM,
  previousPeriodYoY,
  computeGrowth,
} from "@/lib/growth";
import { cn, formatKRW, formatPercent } from "@/lib/utils";
import type { Period, SiteFilter } from "@/lib/types";

interface SalesPageProps {
  searchParams: { site?: string; period?: string; from?: string; to?: string };
}

function defaultRange(period: Period) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(today);
  if (period === "day") from.setDate(from.getDate() - 29);
  if (period === "week") from.setDate(from.getDate() - 7 * 11);
  if (period === "month") from.setMonth(from.getMonth() - 11);
  return {
    from: from.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
  };
}

export default function SalesPage({ searchParams }: SalesPageProps) {
  const siteFilter = (searchParams.site as SiteFilter) ?? "all";
  const period = (searchParams.period as Period) ?? "day";
  const range = resolveRange(searchParams.from, searchParams.to, () =>
    defaultRange(period),
  );

  const series = getSeries({ siteFilter, ...range, period });
  const prevYearSeries = getSeries({
    siteFilter,
    ...previousPeriodYoY(range),
    period,
  }).map((s) => ({
    ...s,
    points: s.points.map((p, idx) => ({
      ...p,
      bucket: series[0]?.points[idx]?.bucket ?? p.bucket,
    })),
  }));

  const current = getKpis({ siteFilter, ...range });
  const yoy = getKpis({ siteFilter, ...previousPeriodYoY(range) });
  const mom = getKpis({ siteFilter, ...previousPeriodMoM(range) });
  const yoyGrowth = computeGrowth(current.grossAmount, yoy.grossAmount);
  const momGrowth = computeGrowth(current.grossAmount, mom.grossAmount);

  const categoryRows = getSubCategoryBreakdown({ siteFilter, ...range });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold">매출 상세</h2>
          <p className="text-sm text-gray-500">
            {range.from} ~ {range.to}
          </p>
        </div>
        <PeriodToggle current={period} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ComparisonCard
          label="당기 매출"
          current={current.grossAmount}
          previous={null}
          variant="neutral"
        />
        <ComparisonCard
          label="전년 동기 대비 (YoY)"
          current={current.grossAmount}
          previous={yoy.grossAmount}
          variant="yoy"
          growth={yoyGrowth}
        />
        <ComparisonCard
          label="전월 대비 (MoM)"
          current={current.grossAmount}
          previous={mom.grossAmount}
          variant="mom"
          growth={momGrowth}
        />
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">기간별 매출 추이</h3>
          <span className="text-[11px] text-gray-400">실선: 당기 · 점선: 전년 동기</span>
        </div>
        <SalesTrendChart series={series} previousYear={prevYearSeries} />
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold">소분류 카테고리별 매출</h3>
        <CategoryStackChart rows={categoryRows} />
      </div>
    </div>
  );
}

function ComparisonCard({
  label,
  current,
  previous,
  growth,
  variant,
}: {
  label: string;
  current: number;
  previous: number | null;
  growth?: ReturnType<typeof computeGrowth>;
  variant: "neutral" | "yoy" | "mom";
}) {
  const pct = growth?.percent ?? null;
  const positive = (pct ?? 0) > 0.05;
  const negative = (pct ?? 0) < -0.05;
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;

  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">
        {formatKRW(current, { compact: true })}
      </div>
      {variant !== "neutral" && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-gray-500">
            비교기 {previous !== null ? formatKRW(previous, { compact: true }) : "—"}
          </span>
          {growth && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium",
                positive && "bg-emerald-50 text-emerald-700",
                negative && "bg-red-50 text-red-700",
                !positive && !negative && "bg-gray-100 text-gray-600",
              )}
            >
              <Icon size={11} />
              {formatPercent(growth.percent)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
