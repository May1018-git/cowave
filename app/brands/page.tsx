import { CategoryFilter } from "@/components/products/CategoryFilter";
import { ManufacturerTable } from "@/components/brands/ManufacturerTable";
import {
  getTopManufacturers,
  resolveCategoryPrefix,
  resolveRange,
} from "@/lib/data-source";
import type { SiteFilter } from "@/lib/types";

interface BrandsPageProps {
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

export default function BrandsPage({ searchParams }: BrandsPageProps) {
  const siteFilter = (searchParams.site as SiteFilter) ?? "all";
  const range = resolveRange(searchParams.from, searchParams.to);
  const categoryPrefix = resolveCategoryPrefix(searchParams);

  const rows = getTopManufacturers({
    siteFilter,
    ...range,
    limit: 20,
    categoryPrefix,
  });

  const qsParams = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v) qsParams.set(k, v);
  }
  const qs = qsParams.toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">제조사/브랜드</h2>
          <p className="text-sm text-gray-500">
            {range.from} ~ {range.to} 기준 TOP 20
          </p>
        </div>
        <CategoryFilter />
      </div>

      <div className="card p-5">
        <p className="mb-2 text-[11px] text-gray-400">
          제조사 이름을 클릭하면 해당 제조사의 상세 매출을 볼 수 있어요.
        </p>
        <ManufacturerTable rows={rows} qs={qs} />
      </div>
    </div>
  );
}
