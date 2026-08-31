import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Factory,
  Upload,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/sales", label: "매출 상세", icon: BarChart3 },
  { href: "/daily", label: "일자별 매출", icon: CalendarDays },
  { href: "/malls", label: "쇼핑몰 비교", icon: ShoppingBag },
  { href: "/products", label: "상품/카탈로그", icon: Package },
  { href: "/brands", label: "제조사/브랜드", icon: Factory },
  { href: "/upload", label: "데이터 업로드", icon: Upload },
];

/** 에누리 관리자 사이트로 나가는 외부 링크. 새 탭으로 열려 현재 화면(필터 등)을 잃지 않는다. */
export const EXTERNAL_LINKS = [
  { href: "http://jca.enuri.com/ecrm/Popular/Main.asp", label: "인기도 바로가기" },
  { href: "http://jca.enuri.com/ecrm/popular/OrderData_Raw.asp", label: "GMV Raw Data 바로가기" },
];
