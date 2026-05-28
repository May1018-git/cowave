import { SiteToggle } from "./SiteToggle";
import { DateRangePicker } from "./DateRangePicker";
import { CategoryToggle } from "./CategoryToggle";
import { MobileNav } from "./MobileNav";
import { getAvailableMidCategories } from "@/lib/data-source";

export function Header() {
  const categoryOptions = getAvailableMidCategories();
  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 border-b bg-white px-4 py-2.5 md:gap-3 md:px-6 md:py-3">
      <div className="flex items-center gap-2">
        <MobileNav />
        <h1 className="text-sm font-semibold text-gray-700 md:text-sm">
          <span className="md:hidden">Cowave</span>
          <span className="hidden md:inline">가격비교 사이트 운영 대시보드</span>
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <DateRangePicker />
        <CategoryToggle options={categoryOptions} />
        <SiteToggle />
      </div>
    </header>
  );
}
