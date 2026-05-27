import { CategoryFilter } from "@/components/products/CategoryFilter";
import { TopProductsTable } from "@/components/dashboard/TopProductsTable";
import {
  getTopProducts,
  resolveCategoryPrefix,
  resolveRange,
} from "@/lib/data-source";
import type { SiteFilter } from "@/lib/types";

interface ProductsPageProps {
  searchParams: {
    site?: string;
    cat?: string;
    cat1?: string;
    cat2?: string;
    cat3?: string;
    from?: string;
    to?: string;
  };
}

export default function ProductsPage({ searchParams }: ProductsPageProps) {
  const siteFilter = (searchParams.site as SiteFilter) ?? "all";
  const range = resolveRange(searchParams.from, searchParams.to);
  const categoryPrefix = resolveCategoryPrefix(searchParams);

  const rows = getTopProducts({
    siteFilter,
    ...range,
    limit: 20,
    categoryPrefix,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">인기 상품 & 카탈로그</h2>
          <p className="text-sm text-gray-500">
            {range.from} ~ {range.to} 기준 TOP 20
          </p>
        </div>
        <CategoryFilter />
      </div>

      <div className="card p-5">
        <TopProductsTable rows={rows} />
      </div>
    </div>
  );
}
