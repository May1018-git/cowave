import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getMallBreakdown,
  getTopProducts,
  resolveRange,
} from "@/lib/data-source";
import { formatKRW, formatNumber } from "@/lib/utils";
import { getCategoryPath } from "@/lib/category-map";
import type { SiteFilter } from "@/lib/types";

interface ManufacturerDetailPageProps {
  params: { manufacturer: string };
  searchParams: { site?: string; from?: string; to?: string };
}

export default function ManufacturerDetailPage({
  params,
  searchParams,
}: ManufacturerDetailPageProps) {
  const manufacturer = decodeURIComponent(params.manufacturer);
  const siteFilter = (searchParams.site as SiteFilter) ?? "all";
  const range = resolveRange(searchParams.from, searchParams.to);

  const products = getTopProducts({
    siteFilter,
    ...range,
    limit: 50,
    manufacturer,
  });

  const mallRows = getMallBreakdown({ siteFilter, ...range, manufacturer });
  const activeMallRows = mallRows.filter((r) => r.grossAmount > 0);

  const totalGross = products.reduce((acc, r) => acc + r.grossAmount, 0);
  const totalOrders = products.reduce((acc, r) => acc + r.quantity, 0);
  const aov = totalOrders === 0 ? 0 : Math.round(totalGross / totalOrders);

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v) qs.set(k, v);
  }
  const backHref = qs.toString() ? `/brands?${qs.toString()}` : "/brands";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={backHref}
          className="mb-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={12} /> 제조사/브랜드로
        </Link>
        <h2 className="text-xl font-semibold">{manufacturer}</h2>
        <p className="text-sm text-gray-500">
          {range.from} ~ {range.to} 기준 · 제조사 상세
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500">총 매출</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {formatKRW(totalGross, { compact: true })}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500">총 주문수량</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {formatNumber(totalOrders)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500">객단가</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {formatKRW(aov, { compact: true })}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold">상품별 매출 (TOP 50)</h3>
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
                <td
                  colSpan={6}
                  className="py-8 text-center text-sm text-gray-400"
                >
                  데이터가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold">쇼핑몰별 매출</h3>
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
            {activeMallRows.map((r) => (
              <tr key={r.mallId} className="border-b last:border-b-0">
                <td className="py-2 pl-2 font-medium">{r.mallName}</td>
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
            {activeMallRows.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-8 text-center text-sm text-gray-400"
                >
                  데이터가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
