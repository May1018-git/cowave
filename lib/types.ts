export type SiteId = "enuri" | "danawa";
export type SiteFilter = SiteId | "all";

export interface Site {
  id: SiteId;
  name: string;
  color: string;
}

export type MallId =
  | "naver"
  | "coupang"
  | "11st"
  | "gmarket"
  | "auction"
  | "own";

export interface Mall {
  id: MallId;
  name: string;
  logoUrl?: string;
  commissionRate: number;
}

export interface CategoryNode {
  code: string;
  name: string;
  parentCode: string | null;
  depth: number;
}

export interface Product {
  id: string;
  name: string;
  categoryCode: string;
  imageUrl?: string;
  basePrice: number;
}

export interface Sale {
  id: string;
  date: string;
  siteId: SiteId;
  productId: string;
  mallId: MallId;
  quantity: number;
  grossAmount: number;
  commission: number;
}

export type Period = "day" | "week" | "month";

export interface DateRange {
  from: string;
  to: string;
}

export interface SeriesPoint {
  bucket: string;
  grossAmount: number;
  commission: number;
  quantity: number;
}

export interface SiteSeries {
  siteId: SiteId | "all";
  points: SeriesPoint[];
}

export interface GrowthMetric {
  current: number;
  previous: number;
  delta: number;
  percent: number | null;
}

export interface MallBreakdownRow {
  mallId: MallId;
  mallName: string;
  grossAmount: number;
  orders: number;
  commission: number;
  share: number;
}

export interface ProductRankRow {
  rank: number;
  prevRank: number | null;
  product: Product;
  grossAmount: number;
  quantity: number;
  commission: number;
  growth: {
    yoy: GrowthMetric;
    mom: GrowthMetric;
  };
}
