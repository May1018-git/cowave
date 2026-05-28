import {
  BarChart3,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Factory,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/sales", label: "매출 상세", icon: BarChart3 },
  { href: "/malls", label: "쇼핑몰 비교", icon: ShoppingBag },
  { href: "/products", label: "상품/카탈로그", icon: Package },
  { href: "/brands", label: "제조사/브랜드", icon: Factory },
];
