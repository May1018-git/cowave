import { CategoryFilter } from "@/components/products/CategoryFilter";
import { LoadMoreToggle } from "@/components/products/LoadMoreToggle";
import { ProductsSearchBar } from "@/components/products/ProductsSearchBar";
import { TopProductsTable } from "@/components/dashboard/TopProductsTable";
import {
  getTopProducts,
  resolveCategoryPrefix,
  resolveRange,
} from "@/lib/data-source";
import type { SiteFilter } from "@/lib/types";

const TOP_LIMIT = 20;

interface ProductsPageProps {
  searchParams: {
    site?: string;
    cat?: string;
    cat1?: string;
    cat2?: string;
    cat3?: string;
    from?: string;
    to?: string;
    q?: string;
    all?: string;
  };
}

export default function ProductsPage({ searchParams }: ProductsPageProps) {
  const siteFilter = (searchParams.site as SiteFilter) ?? "all";
  const range = resolveRange(searchParams.from, searchParams.to);
  const categoryPrefix = resolveCategoryPrefix(searchParams);
  const nameQuery = searchParams.q?.trim() || "";
  // 검색 중이거나 사용자가 "더 보기" 켰을 때는 전체 조회.
  const showAll = !!nameQuery || searchParams.all === "1";

  // 매출 발생 상품 전체를 한 번에 가져온다. 표시는 showAll 여부에 따라 슬라이스.
  // (limit 없이 호출하므로 같은 호출 결과로 전체 개수도 얻을 수 있다.)
  const allRows = getTopProducts({
    siteFilter,
    ...range,
    limit: Number.MAX_SAFE_INTEGER,
    categoryPrefix,
    nameContains: nameQuery || undefined,
  });

  const visibleRows = showAll ? allRows : allRows.slice(0, TOP_LIMIT);
  const totalCount = allRows.length;

  // 상품 상세로 넘어갈 때 이어붙일 필터. 목록 전용 파라미터(q, all)는 제외.
  const detailQs = new URLSearchParams();
  for (const key of ["site", "cat", "cat1", "cat2", "cat3", "from", "to"] as const) {
    const v = searchParams[key];
    if (v) detailQs.set(key, v);
  }

  let summary: string;
  if (nameQuery) {
    summary = `"${nameQuery}" 검색 결과 ${totalCount.toLocaleString()}건`;
  } else if (showAll) {
    summary = `전체 매출 발생 상품 ${totalCount.toLocaleString()}건`;
  } else {
    summary = `TOP ${TOP_LIMIT} / 전체 ${totalCount.toLocaleString()}건 중`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">인기 상품 & 카탈로그</h2>
          <p className="text-sm text-gray-500">
            {range.from} ~ {range.to} 기준 · {summary}
          </p>
        </div>
        <CategoryFilter />
      </div>

      <div className="card space-y-4 p-5">
        <ProductsSearchBar />
        <TopProductsTable rows={visibleRows} qs={detailQs.toString()} />
        <LoadMoreToggle
          showingAll={showAll}
          totalCount={totalCount}
          topCount={TOP_LIMIT}
        />
      </div>
    </div>
  );
}
