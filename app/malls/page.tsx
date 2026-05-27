import Link from "next/link";
import {
  getCategoryBreakdown,
  getMallBreakdown,
  getMallCategoryMatrix,
  resolveRange,
} from "@/lib/data-source";
import { MALLS } from "@/lib/mall-map";
import { formatKRW, formatNumber } from "@/lib/utils";
import type { SiteFilter } from "@/lib/types";
import { MallBarChart } from "@/components/malls/MallBarChart";

interface MallsPageProps {
  searchParams: { site?: string; from?: string; to?: string };
}

function buildQs(searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v) params.set(k, v);
  }
  return params.toString();
}

export default function MallsPage({ searchParams }: MallsPageProps) {
  const siteFilter = (searchParams.site as SiteFilter) ?? "all";
  const range = resolveRange(searchParams.from, searchParams.to);
  const qs = buildQs(searchParams);

  const rows = getMallBreakdown({ siteFilter, ...range });
  const categories = getCategoryBreakdown({ siteFilter, ...range });
  const matrix = getMallCategoryMatrix({ siteFilter, ...range });

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
        </p>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold">쇼핑몰별 매출</h3>
        <MallBarChart
          data={rows.map((r) => ({ name: r.mallName, value: r.grossAmount }))}
        />
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold">쇼핑몰 상세</h3>
        <p className="mb-2 text-[11px] text-gray-400">
          쇼핑몰 이름을 클릭하면 해당 몰의 상품별 매출을 볼 수 있어요.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500">
              <th className="py-2 pl-2 font-medium">쇼핑몰</th>
              <th className="py-2 text-right font-medium">매출액</th>
              <th className="py-2 text-right font-medium">주문수</th>
              <th className="py-2 pr-2 text-right font-medium">점유율</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
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
                <td className="py-2 pr-2 text-right tabular-nums text-gray-600">
                  {(r.share * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card overflow-auto p-5">
        <h3 className="mb-3 text-sm font-semibold">쇼핑몰 × 카테고리 매출</h3>
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
  );
}
