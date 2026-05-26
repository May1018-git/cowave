import { KpiCard } from "@/components/dashboard/KpiCard";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";
import { MallShareChart } from "@/components/dashboard/MallShareChart";
import { TopProductsTable } from "@/components/dashboard/TopProductsTable";
import { SITES } from "@/lib/sites";
import {
  getKpiGrowth,
  getKpis,
  getMallBreakdown,
  getSeries,
  getTopProducts,
  resolveRange,
} from "@/lib/data-source";
import { previousPeriodYoY } from "@/lib/growth";
import { formatKRW, formatNumber } from "@/lib/utils";
import type { SiteFilter } from "@/lib/types";

interface HomeProps {
  searchParams: { site?: string; from?: string; to?: string };
}

export default function Home({ searchParams }: HomeProps) {
  const siteFilter = (searchParams.site as SiteFilter) ?? "all";
  const range = resolveRange(searchParams.from, searchParams.to);
  const usingCustomRange = Boolean(searchParams.from && searchParams.to);
  const trendRange = usingCustomRange
    ? range
    : (() => {
        const t = new Date();
        const f = new Date();
        f.setDate(f.getDate() - 29);
        return {
          from: f.toISOString().slice(0, 10),
          to: t.toISOString().slice(0, 10),
        };
      })();

  const kpi = getKpis({ siteFilter, ...range });
  const growth = getKpiGrowth({ siteFilter, ...range });
  const series = getSeries({ siteFilter, ...trendRange, period: "day" });
  const prevSeries = getSeries({
    siteFilter,
    ...previousPeriodYoY(trendRange),
    period: "day",
  }).map((s) => ({
    ...s,
    points: s.points.map((p, idx) => ({
      ...p,
      bucket: series[0]?.points[idx]?.bucket ?? p.bucket,
    })),
  }));
  const mallBreakdown = getMallBreakdown({ siteFilter, ...range });
  const topProducts = getTopProducts({ siteFilter, ...range, limit: 5 });

  const perSiteSub =
    siteFilter === "all" ? (
      <span className="space-x-2">
        {SITES.map((s) => (
          <span key={s.id}>
            <span
              className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
              style={{ background: s.color }}
            />
            {s.name.slice(0, 1)}{" "}
            {formatKRW(kpi.perSite[s.id].grossAmount, { compact: true })}
          </span>
        ))}
      </span>
    ) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">대시보드</h2>
        <p className="text-sm text-gray-500">
          {usingCustomRange ? "" : "이번 달 "}
          {range.from} ~ {range.to} 기준
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={usingCustomRange ? "선택 기간 매출" : "이번 달 총매출"}
          value={formatKRW(kpi.grossAmount, { compact: true })}
          subValue={perSiteSub}
          yoy={growth.yoy}
          mom={growth.mom}
        />
        <KpiCard
          label="주문 건수"
          value={formatNumber(kpi.orders)}
          subValue={
            siteFilter === "all"
              ? `에 ${formatNumber(kpi.perSite.enuri.orders)} · 다 ${formatNumber(kpi.perSite.danawa.orders)}`
              : null
          }
        />
        <KpiCard
          label="평균 객단가"
          value={formatKRW(kpi.averageOrderValue, { compact: true })}
        />
        <KpiCard
          label="활성 쇼핑몰"
          value={`${kpi.activeMalls}개`}
          subValue={`총 ${mallBreakdown.length}개 채널`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {usingCustomRange ? "기간 매출 추이" : "최근 30일 매출 추이"}
            </h3>
            <span className="text-[11px] text-gray-400">실선: 당기 · 점선: 전년 동기</span>
          </div>
          <SalesTrendChart series={series} previousYear={prevSeries} />
        </div>
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold">쇼핑몰별 점유율</h3>
          <MallShareChart rows={mallBreakdown} />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold">
          TOP 5 인기 상품 {usingCustomRange ? "" : "(이번 달)"}
        </h3>
        <TopProductsTable rows={topProducts} />
      </div>
    </div>
  );
}
