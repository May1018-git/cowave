import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { CategoryStackChart } from "@/components/sales/CategoryStackChart";
import { SubCategoryTable } from "@/components/sales/SubCategoryTable";
import {
  getAchievement,
  getKpis,
  getSubCategoryBreakdown,
  resolveCategoryPrefix,
  resolveRange,
} from "@/lib/data-source";
import {
  previousPeriodMoM,
  previousPeriodYoY,
  computeGrowth,
} from "@/lib/growth";
import { cn, formatKRW, formatPercent } from "@/lib/utils";
import type { SiteFilter } from "@/lib/types";

interface SalesPageProps {
  searchParams: {
    site?: string;
    from?: string;
    to?: string;
    cat?: string;
    cat1?: string;
    cat2?: string;
    cat3?: string;
  };
}

function defaultMonthRange() {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function SalesPage({ searchParams }: SalesPageProps) {
  const siteFilter = (searchParams.site as SiteFilter) ?? "all";
  const range = resolveRange(
    searchParams.from,
    searchParams.to,
    defaultMonthRange,
  );

  const categoryPrefix = resolveCategoryPrefix(searchParams);
  const current = getKpis({ siteFilter, ...range, categoryPrefix });
  const yoy = getKpis({
    siteFilter,
    ...previousPeriodYoY(range),
    categoryPrefix,
  });
  const mom = getKpis({
    siteFilter,
    ...previousPeriodMoM(range),
    categoryPrefix,
  });
  const yoyGrowth = computeGrowth(current.grossAmount, yoy.grossAmount);
  const momGrowth = computeGrowth(current.grossAmount, mom.grossAmount);

  const categoryRows = getSubCategoryBreakdown({
    siteFilter,
    ...range,
    categoryPrefix,
  });

  const achievement = getAchievement({ siteFilter, ...range, categoryPrefix });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">매출 상세</h2>
        <p className="text-sm text-gray-500">
          {range.from} ~ {range.to}
        </p>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-4 md:grid-cols-2",
          achievement ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        <ComparisonCard
          label="당기 매출"
          current={current.grossAmount}
          previous={null}
          variant="neutral"
        />
        {achievement && (
          <AchievementCard
            label="월 목표 달성율"
            rate={achievement.rate}
            target={achievement.target}
            actual={achievement.actual}
          />
        )}
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
        <h3 className="mb-3 text-sm font-semibold">소분류 카테고리 상세</h3>
        <SubCategoryTable rows={categoryRows} />
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

  if (variant === "neutral") {
    return (
      <div className="card p-4">
        <div className="text-xs font-medium text-gray-500">{label}</div>
        <div className="mt-1 text-2xl font-semibold tracking-tight">
          {formatKRW(current, { compact: true })}
        </div>
        <div className="mt-0.5 tabular-nums text-[11px] text-gray-400">
          {formatKRW(current)}원
        </div>
      </div>
    );
  }

  const delta = previous !== null ? current - previous : null;
  const deltaStr =
    delta !== null
      ? delta >= 0
        ? `+${formatKRW(delta, { compact: true })}`
        : formatKRW(delta, { compact: true })
      : null;

  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div
        className={cn(
          "mt-1 flex items-center gap-1 text-2xl font-semibold tracking-tight",
          positive && "text-emerald-600",
          negative && "text-red-600",
          !positive && !negative && "text-gray-500",
        )}
      >
        <Icon size={20} />
        {formatPercent(pct)}
      </div>
      {previous !== null && (
        <div className="mt-1.5 text-xs text-gray-500">
          비교기 {formatKRW(previous, { compact: true })}
          {deltaStr && (
            <span
              className={cn(
                "ml-1",
                positive && "text-emerald-600",
                negative && "text-red-600",
              )}
            >
              ({deltaStr})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function AchievementCard({
  label,
  rate,
  target,
  actual,
}: {
  label: string;
  rate: number;
  target: number;
  actual: number;
}) {
  const pct = rate * 100;
  const textColor =
    pct >= 100
      ? "text-emerald-600"
      : pct >= 80
        ? "text-gray-700"
        : "text-amber-600";
  const barColor =
    pct >= 100 ? "bg-emerald-500" : pct >= 80 ? "bg-blue-500" : "bg-amber-500";

  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight",
          textColor,
        )}
      >
        {pct.toFixed(1)}%
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn("h-full rounded-full", barColor)}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <div className="mt-1.5 text-xs text-gray-500">
        목표{" "}
        <span
          title={`${formatKRW(target)}원`}
          className="cursor-help underline decoration-dotted underline-offset-2"
        >
          {formatKRW(target, { compact: true })}
        </span>{" "}
        · 실적 {formatKRW(actual, { compact: true })}
      </div>
    </div>
  );
}
