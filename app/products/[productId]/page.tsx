import Link from "next/link";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Minus } from "lucide-react";
import {
  getMallBreakdown,
  getProduct,
  resolveCategoryPrefix,
  resolveRange,
} from "@/lib/data-source";
import { computeGrowth, previousPeriodYoY } from "@/lib/growth";
import { getCategoryPath } from "@/lib/category-map";
import { cn, formatKRW, formatNumber, formatPercent } from "@/lib/utils";
import type { SiteFilter } from "@/lib/types";

interface ProductDetailPageProps {
  params: { productId: string };
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

export default function ProductDetailPage({
  params,
  searchParams,
}: ProductDetailPageProps) {
  const productId = decodeURIComponent(params.productId);
  const product = getProduct(productId);
  const siteFilter = (searchParams.site as SiteFilter) ?? "all";
  const range = resolveRange(searchParams.from, searchParams.to);
  const categoryPrefix = resolveCategoryPrefix(searchParams);

  const mallRows = getMallBreakdown({
    siteFilter,
    ...range,
    categoryPrefix,
    productId,
  });
  const activeMallRows = mallRows.filter((r) => r.grossAmount > 0);

  const totalGross = mallRows.reduce((acc, r) => acc + r.grossAmount, 0);
  const totalQuantity = mallRows.reduce((acc, r) => acc + r.quantity, 0);
  const aov = totalQuantity === 0 ? 0 : Math.round(totalGross / totalQuantity);

  const yoyMallRows = getMallBreakdown({
    siteFilter,
    ...previousPeriodYoY(range),
    categoryPrefix,
    productId,
  });
  const yoyGross = yoyMallRows.reduce((acc, r) => acc + r.grossAmount, 0);
  const growth = computeGrowth(totalGross, yoyGross);

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v) qs.set(k, v);
  }
  const backHref = qs.toString() ? `/products?${qs.toString()}` : "/products";

  const pct = growth.percent;
  const positive = (pct ?? 0) > 0.05;
  const negative = (pct ?? 0) < -0.05;
  const GrowthIcon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={backHref}
          className="mb-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={12} /> 상품/카탈로그로
        </Link>
        <h2 className="text-xl font-semibold">
          {product?.name ?? productId}
        </h2>
        <p className="text-sm text-gray-500">
          {range.from} ~ {range.to} 기준 · 쇼핑몰별 상세매출
        </p>
        {product && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span>{getCategoryPath(product.categoryCode).join(" › ")}</span>
            {product.manufacturer && (
              <span className="text-gray-400">· {product.manufacturer}</span>
            )}
            {product.modelNumber ? (
              <span className="tabular-nums text-gray-400">
                · 모델번호 {product.modelNumber}
              </span>
            ) : product.productCode ? (
              <span
                className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] tabular-nums text-gray-500"
                title="에누리 모델번호 미매핑 — 상품코드 표시"
              >
                {product.productCode}
              </span>
            ) : null}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500">총 매출</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {formatKRW(totalGross, { compact: true })}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500">총 판매수량</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {formatNumber(totalQuantity)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500">평균 판매가</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {formatKRW(aov, { compact: true })}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-500">전년 동기 대비 (YoY)</div>
          <div
            className={cn(
              "mt-1 flex items-center gap-1 text-2xl font-semibold tracking-tight",
              positive && "text-emerald-600",
              negative && "text-red-600",
              !positive && !negative && "text-gray-500",
            )}
          >
            <GrowthIcon size={20} />
            {formatPercent(pct)}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-semibold">쇼핑몰별 매출</h3>
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500">
                <th className="py-2 pl-2 font-medium">쇼핑몰</th>
                <th className="py-2 text-right font-medium">매출액</th>
                <th className="py-2 text-right font-medium">수량</th>
                <th className="py-2 text-right font-medium">주문수</th>
                <th className="py-2 pr-2 text-right font-medium">점유율</th>
              </tr>
            </thead>
            <tbody>
              {activeMallRows.map((r) => (
                <tr key={r.mallId} className="border-b last:border-b-0">
                  <td className="py-2 pl-2 font-medium">
                    <Link
                      href={`/malls/${r.mallId}${qs.toString() ? `?${qs.toString()}` : ""}`}
                      className="text-blue-600 hover:underline"
                    >
                      {r.mallName}
                    </Link>
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formatKRW(r.grossAmount)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-gray-600">
                    {formatNumber(r.quantity)}
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
                  <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
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
