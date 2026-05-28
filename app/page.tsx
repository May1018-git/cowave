import { KpiCard } from "@/components/dashboard/KpiCard";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";
import { MallShareChart } from "@/components/dashboard/MallShareChart";
import { TopProductsTable } from "@/components/dashboard/TopProductsTable";
import { SITES } from "@/lib/sites";
import {
  getAchievement,
  getDataLast30Range,
  getKpiGrowth,
  getKpis,
  getMallBreakdown,
  getSeries,
  getTopProducts,
  resolveCategoryPrefix,
  resolveRange,
} from "@/lib/data-source";
import { previousPeriodYoY } from "@/lib/growth";
import { formatKRW, formatNumber } from "@/lib/utils";
import type { SiteFilter } from "@/lib/types";

interface HomeProps {
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

export default function Home({ searchParams }: HomeProps) {
  const siteFilter = (searchParams.site as SiteFilter) ?? "all";
  const range = resolveRange(searchParams.from, searchParams.to);
  const usingCustomRange = Boolean(searchParams.from && searchParams.to);
  const trendRange = usingCustomRange ? range : getDataLast30Range();
  const categoryPrefix = resolveCategoryPrefix(searchParams);

  const kpi = getKpis({ siteFilter, ...range, categoryPrefix });
  const growth = getKpiGrowth({ siteFilter, ...range, categoryPrefix });
  const achievement = getAchievement({ siteFilter, ...range, categoryPrefix });
  const series = getSeries({
    siteFilter,
    ...trendRange,
    categoryPrefix,
    period: "day",
  });
  const prevRaw = getSeries({
    siteFilter,
    ...previousPeriodYoY(trendRange),
    categoryPrefix,
    period: "day",
  });
  // 전년 동기 라인은 날짜(연-1) 기준으로 당기 버킷에 맞춘다. 인덱스 정렬은
  // 전년 구간에 결측일(예: 전년 동기 일부 월 데이터 없음)이 있으면 라인이
  // 통째로 밀리고 끝부분이 0으로 끊긴다.
  const curBySite = new Map(series.map((c) => [c.siteId, c.points]));
  const prevSeries = prevRaw.map((s) => {
    const byDate = new Map(s.points.map((p) => [p.bucket, p.grossAmount]));
    const spine = curBySite.get(s.siteId) ?? series[0]?.points ?? [];
    return {
      siteId: s.siteId,
      points: spine.flatMap((cur) => {
        const yoyDate = `${Number(cur.bucket.slice(0, 4)) - 1}${cur.bucket.slice(4)}`;
        const gross = byDate.get(yoyDate);
        // 전년 해당일 데이터가 없으면 점을 만들지 않는다 (0 대신 라인 끊김).
        if (gross === undefined) return [];
        return [{ bucket: cur.bucket, grossAmount: gross, commission: 0, quantity: 0 }];
      }),
    };
  });
  const mallBreakdown = getMallBreakdown({ siteFilter, ...range, categoryPrefix });
  const topProducts = getTopProducts({
    siteFilter,
    ...range,
    categoryPrefix,
    limit: 20,
  });

  const showSiteBreakdown = siteFilter === "all" && SITES.length > 1;
  const perSiteSub = showSiteBreakdown ? (
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
          subValue={
            achievement ? (
              <span>
                월목표 {formatKRW(achievement.target, { compact: true })} · 달성{" "}
                <span
                  className={
                    achievement.rate >= 1
                      ? "font-medium text-emerald-600"
                      : "font-medium text-gray-700"
                  }
                >
                  {(achievement.rate * 100).toFixed(0)}%
                </span>
              </span>
            ) : (
              perSiteSub
            )
          }
          yoy={growth.yoy}
          mom={growth.mom}
        />
        <KpiCard
          label="주문 건수"
          value={formatNumber(kpi.orders)}
          subValue={
            showSiteBreakdown
              ? SITES.map((s) => `${s.name.slice(0, 1)} ${formatNumber(kpi.perSite[s.id].orders)}`).join(" · ")
              : null
          }
        />
        <KpiCard
          label="평균 객단가"
          value={`${formatKRW(kpi.averageOrderValue)}원`}
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
          <h3 className="mb-3 text-sm font-semibold">
            쇼핑몰별 점유율
            <span className="ml-1 text-xs font-normal text-gray-400">
              (TOP 10)
            </span>
          </h3>
          <MallShareChart rows={mallBreakdown.slice(0, 10)} />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold">
          TOP 20 인기 상품 {usingCustomRange ? "" : "(이번 달)"}
        </h3>
        <TopProductsTable rows={topProducts} />
      </div>
    </div>
  );
}
