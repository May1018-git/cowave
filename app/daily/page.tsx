import { DailySalesChart } from "@/components/daily/DailySalesChart";
import { DailySalesTable } from "@/components/daily/DailySalesTable";
import {
  getDailyBreakdown,
  getDataLast30Range,
  resolveCategoryPrefix,
  resolveRange,
} from "@/lib/data-source";
import { rangeLengthDays } from "@/lib/growth";
import { formatKRW, formatNumber } from "@/lib/utils";
import type { SiteFilter } from "@/lib/types";

interface DailyPageProps {
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

function buildProductLinkParams(searchParams: DailyPageProps["searchParams"]) {
  const usp = new URLSearchParams();
  for (const key of ["site", "cat", "cat1", "cat2", "cat3"] as const) {
    const v = searchParams[key];
    if (v) usp.set(key, v);
  }
  return usp.toString();
}

export default function DailyPage({ searchParams }: DailyPageProps) {
  const siteFilter = (searchParams.site as SiteFilter) ?? "all";
  // 별도 기간을 고르지 않았으면 "오늘"이 아니라 실제 업로드된 마지막 날짜
  // 기준 최근 30일로 — 업로드가 며칠 밀려도 빈 화면이 뜨지 않는다.
  const range = resolveRange(searchParams.from, searchParams.to, getDataLast30Range);
  const categoryPrefix = resolveCategoryPrefix(searchParams);
  // 매출 셀 → /products 링크에 붙일 필터. from/to 는 날짜별로 그날 하루로
  // 바꿔 넣으므로 여기서는 사이트/카테고리 필터만 들고 간다.
  const productLinkParams = buildProductLinkParams(searchParams);

  const rows = getDailyBreakdown({ siteFilter, ...range, categoryPrefix });

  const totalGross = rows.reduce((sum, r) => sum + r.grossAmount, 0);
  const totalOrders = rows.reduce((sum, r) => sum + r.orders, 0);
  const spanDays = rangeLengthDays(range);
  const avgDailyGross = spanDays > 0 ? Math.round(totalGross / spanDays) : 0;
  const daysWithSales = rows.filter((r) => r.grossAmount > 0).length;

  const chartData = rows.map((r) => ({
    date: r.date,
    current: r.grossAmount,
    previous: r.growth.yoy.previous,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">일자별 매출</h2>
        <p className="text-sm text-gray-500">
          {range.from} ~ {range.to}
          <span className="ml-2 text-[11px] text-gray-400">
            ({spanDays}일 중 매출 발생 {daysWithSales}일)
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500">기간 총매출</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {formatKRW(totalGross, { compact: true })}
          </div>
          <div className="mt-0.5 tabular-nums text-[11px] text-gray-400">
            {formatKRW(totalGross)}원
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500">일평균 매출</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {formatKRW(avgDailyGross, { compact: true })}
          </div>
          <div className="mt-0.5 text-[11px] text-gray-400">{spanDays}일 기준</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500">총 주문건수</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {formatNumber(totalOrders)}
          </div>
          <div className="mt-0.5 text-[11px] text-gray-400">
            일평균 {formatNumber(spanDays > 0 ? Math.round(totalOrders / spanDays) : 0)}건
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-1">
          <h3 className="text-sm font-semibold">일자별 매출 추이</h3>
          <span className="text-[11px] text-gray-400">
            진한 막대: 당기 · 옅은 막대: 전년 동일자
          </span>
        </div>
        <DailySalesChart data={chartData} />
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold">일자별 상세</h3>
        <p className="mb-2 text-[11px] text-gray-400">
          매출 금액을 클릭하면 그날 판매된 상품별 상세를 볼 수 있어요.
        </p>
        <DailySalesTable rows={rows} linkParams={productLinkParams} />
      </div>
    </div>
  );
}
