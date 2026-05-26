import {
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { getMockProducts, getMockSales } from "./mock-data";
import { MALLS } from "./mall-map";
import { SITES } from "./sites";
import { computeGrowth, previousPeriodMoM, previousPeriodYoY } from "./growth";
import { getTopCategory } from "./category-map";
import type {
  GrowthMetric,
  MallBreakdownRow,
  MallId,
  Period,
  Product,
  ProductRankRow,
  Sale,
  SeriesPoint,
  SiteFilter,
  SiteId,
  SiteSeries,
} from "./types";

interface BaseQuery {
  siteFilter: SiteFilter;
  from: string;
  to: string;
}

function filterSales(query: BaseQuery, sales = getMockSales()): Sale[] {
  const fromDate = parseISO(query.from);
  const toDate = parseISO(query.to);
  return sales.filter((s) => {
    if (query.siteFilter !== "all" && s.siteId !== query.siteFilter) return false;
    const d = parseISO(s.date);
    return isWithinInterval(d, { start: fromDate, end: toDate });
  });
}

function bucketKey(date: string, period: Period): string {
  const d = parseISO(date);
  if (period === "day") return format(d, "yyyy-MM-dd");
  if (period === "week") return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-'W'II");
  return format(d, "yyyy-MM");
}

function emptyBucket(bucket: string): SeriesPoint {
  return { bucket, grossAmount: 0, commission: 0, quantity: 0 };
}

export function getSeries(
  query: BaseQuery & { period: Period },
): SiteSeries[] {
  const sales = filterSales(query);

  if (query.siteFilter === "all") {
    return SITES.map((site) => {
      const map = new Map<string, SeriesPoint>();
      for (const s of sales) {
        if (s.siteId !== site.id) continue;
        const key = bucketKey(s.date, query.period);
        const p = map.get(key) ?? emptyBucket(key);
        p.grossAmount += s.grossAmount;
        p.commission += s.commission;
        p.quantity += s.quantity;
        map.set(key, p);
      }
      return {
        siteId: site.id,
        points: [...map.values()].sort((a, b) =>
          a.bucket.localeCompare(b.bucket),
        ),
      };
    });
  }

  const map = new Map<string, SeriesPoint>();
  for (const s of sales) {
    const key = bucketKey(s.date, query.period);
    const p = map.get(key) ?? emptyBucket(key);
    p.grossAmount += s.grossAmount;
    p.commission += s.commission;
    p.quantity += s.quantity;
    map.set(key, p);
  }
  return [
    {
      siteId: query.siteFilter,
      points: [...map.values()].sort((a, b) =>
        a.bucket.localeCompare(b.bucket),
      ),
    },
  ];
}

export interface KpiSummary {
  grossAmount: number;
  orders: number;
  averageOrderValue: number;
  activeMalls: number;
  perSite: Record<SiteId, { grossAmount: number; orders: number }>;
}

export function getKpis(query: BaseQuery): KpiSummary {
  const sales = filterSales(query);
  const orders = sales.length;
  const grossAmount = sales.reduce((acc, s) => acc + s.grossAmount, 0);
  const activeMalls = new Set(sales.map((s) => s.mallId)).size;

  const perSite: Record<SiteId, { grossAmount: number; orders: number }> = {
    enuri: { grossAmount: 0, orders: 0 },
    danawa: { grossAmount: 0, orders: 0 },
  };
  for (const s of sales) {
    perSite[s.siteId].grossAmount += s.grossAmount;
    perSite[s.siteId].orders += 1;
  }

  return {
    grossAmount,
    orders,
    averageOrderValue: orders === 0 ? 0 : Math.round(grossAmount / orders),
    activeMalls,
    perSite,
  };
}

export function getKpiGrowth(query: BaseQuery): {
  yoy: GrowthMetric;
  mom: GrowthMetric;
} {
  const current = getKpis(query).grossAmount;
  const yoyRange = previousPeriodYoY(query);
  const momRange = previousPeriodMoM(query);
  const yoyPrev = getKpis({ ...query, ...yoyRange }).grossAmount;
  const momPrev = getKpis({ ...query, ...momRange }).grossAmount;
  return {
    yoy: computeGrowth(current, yoyPrev),
    mom: computeGrowth(current, momPrev),
  };
}

export function getMallBreakdown(query: BaseQuery): MallBreakdownRow[] {
  const sales = filterSales(query);
  const total = sales.reduce((acc, s) => acc + s.grossAmount, 0);

  const rows = MALLS.map((m) => {
    const matched = sales.filter((s) => s.mallId === m.id);
    const gross = matched.reduce((acc, s) => acc + s.grossAmount, 0);
    const commission = matched.reduce((acc, s) => acc + s.commission, 0);
    return {
      mallId: m.id,
      mallName: m.name,
      grossAmount: gross,
      orders: matched.length,
      commission,
      share: total === 0 ? 0 : gross / total,
    };
  });
  return rows.sort((a, b) => b.grossAmount - a.grossAmount);
}

export function getTopProducts(
  query: BaseQuery & { limit?: number },
): ProductRankRow[] {
  const limit = query.limit ?? 10;
  const productsById = new Map(getMockProducts().map((p) => [p.id, p]));

  const rank = (q: BaseQuery) => {
    const sales = filterSales(q);
    const map = new Map<string, { gross: number; qty: number; commission: number }>();
    for (const s of sales) {
      const acc = map.get(s.productId) ?? { gross: 0, qty: 0, commission: 0 };
      acc.gross += s.grossAmount;
      acc.qty += s.quantity;
      acc.commission += s.commission;
      map.set(s.productId, acc);
    }
    return [...map.entries()]
      .map(([productId, agg]) => ({ productId, ...agg }))
      .sort((a, b) => b.gross - a.gross);
  };

  const current = rank(query);
  const yoyRange = previousPeriodYoY(query);
  const momRange = previousPeriodMoM(query);
  const yoyRanks = rank({ ...query, ...yoyRange });
  const momRanks = rank({ ...query, ...momRange });
  const momRankById = new Map(momRanks.map((r, i) => [r.productId, { rank: i + 1, gross: r.gross }]));
  const yoyById = new Map(yoyRanks.map((r) => [r.productId, r.gross]));

  return current.slice(0, limit).map((row, i) => {
    const product = productsById.get(row.productId) as Product;
    const momPrev = momRankById.get(row.productId);
    const yoyPrev = yoyById.get(row.productId) ?? 0;

    return {
      rank: i + 1,
      prevRank: momPrev?.rank ?? null,
      product,
      grossAmount: row.gross,
      quantity: row.qty,
      commission: row.commission,
      growth: {
        yoy: computeGrowth(row.gross, yoyPrev),
        mom: computeGrowth(row.gross, momPrev?.gross ?? 0),
      },
    };
  });
}

export function getCategoryBreakdown(query: BaseQuery): {
  topCode: string;
  topName: string;
  grossAmount: number;
}[] {
  const sales = filterSales(query);
  const productsById = new Map(getMockProducts().map((p) => [p.id, p]));
  const map = new Map<string, { name: string; gross: number }>();
  for (const s of sales) {
    const product = productsById.get(s.productId);
    if (!product) continue;
    const top = getTopCategory(product.categoryCode);
    if (!top) continue;
    const acc = map.get(top.code) ?? { name: top.name, gross: 0 };
    acc.gross += s.grossAmount;
    map.set(top.code, acc);
  }
  return [...map.entries()]
    .map(([topCode, { name, gross }]) => ({
      topCode,
      topName: name,
      grossAmount: gross,
    }))
    .sort((a, b) => b.grossAmount - a.grossAmount);
}

export interface MallCategoryCell {
  mallId: MallId;
  topCode: string;
  grossAmount: number;
}

export function getMallCategoryMatrix(query: BaseQuery): MallCategoryCell[] {
  const sales = filterSales(query);
  const productsById = new Map(getMockProducts().map((p) => [p.id, p]));
  const map = new Map<string, MallCategoryCell>();
  for (const s of sales) {
    const product = productsById.get(s.productId);
    if (!product) continue;
    const top = getTopCategory(product.categoryCode);
    if (!top) continue;
    const key = `${s.mallId}|${top.code}`;
    const cell = map.get(key) ?? {
      mallId: s.mallId,
      topCode: top.code,
      grossAmount: 0,
    };
    cell.grossAmount += s.grossAmount;
    map.set(key, cell);
  }
  return [...map.values()];
}

export function getDefaultRange(period: Period = "day"): { from: string; to: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (period === "month") {
    return {
      from: format(startOfMonth(today), "yyyy-MM-dd"),
      to: format(endOfMonth(today), "yyyy-MM-dd"),
    };
  }
  const past = new Date(today);
  past.setDate(past.getDate() - 29);
  return {
    from: format(past, "yyyy-MM-dd"),
    to: format(today, "yyyy-MM-dd"),
  };
}

export function getCurrentMonthRange(): { from: string; to: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    from: format(startOfMonth(today), "yyyy-MM-dd"),
    to: format(endOfMonth(today), "yyyy-MM-dd"),
  };
}
