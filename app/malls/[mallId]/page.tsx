import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getMall } from "@/lib/mall-map";
import {
  getMallBreakdown,
  getTopProducts,
  resolveCategoryPrefix,
  resolveRange,
} from "@/lib/data-source";
import { formatKRW, formatNumber } from "@/lib/utils";
import { getCategoryPath } from "@/lib/category-map";
import type { SiteFilter } from "@/lib/types";

interface MallDetailPageProps {
  params: { mallId: string };
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

export default function MallDetailPage({
  params,
  searchParams,
}: MallDetailPageProps) {
  const mall = getMall(params.mallId);
  const siteFilter = (searchParams.site as SiteFilter) ?? "all";
  const range = resolveRange(searchParams.from, searchParams.to);
  const categoryPrefix = resolveCategoryPrefix(searchParams);

  const products = getTopProducts({
    siteFilter,
    ...range,
    categoryPrefix,
    limit: 100,
    mallId: params.mallId,
  });
  const breakdown = getMallBreakdown({
    siteFilter,
    ...range,
    categoryPrefix,
  }).find((b) => b.mallId === params.mallId);

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v) qs.set(k, v);
  }
  const backHref = qs.toString() ? `/malls?${qs.toString()}` : "/malls";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={backHref}
          className="mb-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={12} /> 쇼핑몰 비교로
        </Link>
        <h2 className="text-xl font-semibold">{mall?.name ?? params.mallId}</h2>
        <p className="text-sm text-gray-500">
          {range.from} ~ {range.to} 기준 · 상품별 매출
        </p>
      </div>

      {breakdown && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <div className="text-xs font-medium text-gray-500">총 매출</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">
              {formatKRW(breakdown.grossAmount, { compact: true })}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-medium text-gray-500">주문수</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">
              {formatNumber(breakdown.orders)}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-medium text-gray-500">점유율</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">
              {(breakdown.share * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold">상품별 매출</h3>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500">
              <th className="py-2 pl-2 font-medium">#</th>
              <th className="py-2 font-medium">상품</th>
              <th className="py-2 font-medium">카테고리</th>
              <th className="py-2 font-medium">모델번호/상품코드</th>
              <th className="py-2 text-right font-medium">매출액</th>
              <th className="py-2 pr-2 text-right font-medium">수량</th>
            </tr>
          </thead>
          <tbody>
            {products.map((r) => (
              <tr key={r.product.id} className="border-b last:border-b-0">
                <td className="py-2 pl-2 text-sm font-semibold text-gray-700">
                  {r.rank}
                </td>
                <td
                  className="max-w-[16rem] truncate py-2 font-medium"
                  title={r.product.name}
                >
                  {r.product.name}
                </td>
                <td className="py-2 text-xs text-gray-500">
                  {getCategoryPath(r.product.categoryCode).join(" › ")}
                </td>
                <td className="py-2 text-xs">
                  {r.product.modelNumber ? (
                    <span className="tabular-nums text-gray-600">
                      {r.product.modelNumber}
                    </span>
                  ) : r.product.productCode ? (
                    <span
                      className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] tabular-nums text-gray-500"
                      title="에누리 모델번호 미매핑 — 상품코드 표시"
                    >
                      {r.product.productCode}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatKRW(r.grossAmount)}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums text-gray-600">
                  {formatNumber(r.quantity)}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-gray-400">
                  데이터가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
