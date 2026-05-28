import Link from "next/link";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  getCategoryBreakdown,
  getMallBreakdown,
  getMallCategoryMatrix,
  resolveCategoryPrefix,
  resolveRange,
} from "@/lib/data-source";
import { computeGrowth, previousPeriodMoM, previousPeriodYoY } from "@/lib/growth";
import { MALLS } from "@/lib/mall-map";
import { cn, formatKRW, formatNumber, formatPercent } from "@/lib/utils";
import type { SiteFilter } from "@/lib/types";
import { MallBarChart } from "@/components/malls/MallBarChart";

interface MallsPageProps {
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

function buildQs(searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v) params.set(k, v);
  }
  return params.toString();
}

function GrowthCell({ percent }: { percent: number | null }) {
  const p = percent;
  const positive = (p ?? 0) > 0.05;
  const negative = (p ?? 0) < -0.05;
  const Icon = positive ? ArrowUp : negative ? ArrowDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 tabular-nums text-xs font-medium",
        positive && "text-emerald-700",
        negative && "text-red-700",
        !positive && !negative && "text-gray-500",
      )}
    >
      <Icon size={11} />
      {formatPercent(p)}
    </span>
  );
}

export default function MallsPage({ searchParams }: MallsPageProps) {
  const siteFilter = (searchParams.site as SiteFilter) ?? "all";
  const range = resolveRange(searchParams.from, searchParams.to);
  const categoryPrefix = resolveCategoryPrefix(searchParams);
  const qs = buildQs(searchParams);

  const rows = getMallBreakdown({ siteFilter, ...range, categoryPrefix });
  const yoyRange = previousPeriodYoY(range);
  const momRange = previousPeriodMoM(range);
  const yoyRows = getMallBreakdown({
    siteFilter,
    ...yoyRange,
    categoryPrefix,
  });
  const momRows = getMallBreakdown({
    siteFilter,
    ...momRange,
    categoryPrefix,
  });
  const yoyByMallId = new Map(yoyRows.map((r) => [r.mallId, r.grossAmount]));
  const momByMallId = new Map(momRows.map((r) => [r.mallId, r.grossAmount]));

  // 그래프는 당기 매출 > 0 인 몰만 (0 매출 몰은 그래프 의미 없음)
  const chartRows = rows.filter((r) => r.grossAmount > 0);

  const categories = getCategoryBreakdown({
    siteFilter,
    ...range,
    categoryPrefix,
  });
  const matrix = getMallCategoryMatrix({
    siteFilter,
    ...range,
    categoryPrefix,
  });

  const matrixByCell = new Map<string, number>();
  for (const c of matrix) {
    matrixByCell.set(`${c.mallId}|${c.topCode}`, c.grossAmount);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">쇼핑몰 비교</h2>
        <p className="text-sm text-gray-500">
          {range.from} ~ {range.to}
          <span className="ml-2 text-[11px] text-gray-400">
            (당기 vs 전년 동기)
          </span>
        </p>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-1">
          <h3 className="text-sm font-semibold">쇼핑몰별 매출</h3>
          <span className="text-[11px] text-gray-400">
            진한 막대: 당기 · 옅은 막대: 전년 동기
          </span>
        </div>
        <MallBarChart
          data={chartRows.map((r) => ({
            name: r.mallName,
            current: r.grossAmount,
            previous: yoyByMallId.get(r.mallId) ?? 0,
          }))}
        />
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold">쇼핑몰 상세</h3>
        <p className="mb-2 text-[11px] text-gray-400">
          쇼핑몰 이름을 클릭하면 해당 몰의 상품별 매출을 볼 수 있어요.
        </p>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500">
              <th className="py-2 pl-2 font-medium">쇼핑몰</th>
              <th className="py-2 text-right font-medium">매출액</th>
              <th className="py-2 text-right font-medium">주문수</th>
              <th className="py-2 text-right font-medium">객단가</th>
              <th className="py-2 text-right font-medium">YoY</th>
              <th className="py-2 text-right font-medium">MoM</th>
              <th className="py-2 pr-2 text-right font-medium">점유율</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const aov = r.orders === 0 ? 0 : Math.round(r.grossAmount / r.orders);
              const yoyPrev = yoyByMallId.get(r.mallId) ?? 0;
              const momPrev = momByMallId.get(r.mallId) ?? 0;
              const yoyG = computeGrowth(r.grossAmount, yoyPrev);
              const momG = computeGrowth(r.grossAmount, momPrev);
              return (
                <tr key={r.mallId} className="border-b last:border-b-0">
                  <td className="py-2 pl-2 font-medium">
                    <Link
                      href={qs ? `/malls/${r.mallId}?${qs}` : `/malls/${r.mallId}`}
                      className="text-blue-600 hover:underline"
                    >
                      {r.mallName}
                    </Link>
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatKRW(r.grossAmount)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-gray-600">
                    {formatNumber(r.orders)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-gray-600">
                    {aov > 0 ? formatKRW(aov) : "—"}
                  </td>
                  <td className="py-2 text-right">
                    <GrowthCell percent={yoyG.percent} />
                  </td>
                  <td className="py-2 text-right">
                    <GrowthCell percent={momG.percent} />
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-gray-600">
                    {(r.share * 100).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold">쇼핑몰 × 카테고리 매출</h3>
        <div className="table-scroll">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pl-2 font-medium">몰 \\ 카테고리</th>
              {categories.map((c) => (
                <th key={c.topCode} className="py-2 px-2 text-right font-medium">
                  {c.topName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MALLS.map((m) => (
              <tr key={m.id} className="border-b last:border-b-0">
                <td className="py-2 pl-2 font-medium">{m.name}</td>
                {categories.map((c) => {
                  const val = matrixByCell.get(`${m.id}|${c.topCode}`) ?? 0;
                  return (
                    <td
                      key={c.topCode}
                      className="py-2 px-2 text-right tabular-nums text-gray-600"
                    >
                      {val > 0 ? formatKRW(val, { compact: true }) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
