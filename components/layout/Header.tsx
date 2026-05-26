import { SiteToggle } from "./SiteToggle";
import { DateRangePicker } from "./DateRangePicker";

export function Header() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-6 py-3">
      <h1 className="text-sm font-semibold text-gray-700">
        가격비교 사이트 운영 대시보드
      </h1>
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker />
        <SiteToggle />
      </div>
    </header>
  );
}
