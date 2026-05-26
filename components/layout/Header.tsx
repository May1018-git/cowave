import { SiteToggle } from "./SiteToggle";

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-6">
      <h1 className="text-sm font-semibold text-gray-700">
        가격비교 사이트 운영 대시보드
      </h1>
      <SiteToggle />
    </header>
  );
}
