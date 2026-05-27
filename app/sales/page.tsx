import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { CategoryStackChart } from "@/components/sales/CategoryStackChart";
import { SubCategoryTable } from "@/components/sales/SubCategoryTable";
import {
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
  today.setHours(0, 0, 0, 0);
  const from = new Date(today);
  from.setDate(from.getDate() - 29);
  return {
    from: from.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">매출 상세</h2>
        <p className="text-sm text-gray-500">
          {range.from} ~ {range.to}
        </p>
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
