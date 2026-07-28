import {
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { getMockProducts, getMockSales } from "./mock-data";
import { loadDataDirCached } from "./loaders/file-system";
import { loadTargetsCached } from "./loaders/target";
import { MALLS } from "./mall-map";
import { SITES } from "./sites";
import { computeGrowth, previousPeriodMoM, previousPeriodYoY } from "./growth";
import { getMidCategory, getSubCategory, getTopCategory } from "./category-map";
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

/**
 * 데이터 소스 자동 선택:
 *   - DATA_DIR 환경변수가 설정되어 있고 파일이 있으면 실제 파일 로드
 *   - 아니면 더미 데이터 (UI 데모용)
 */
function loadSales(): Sale[] {
  const dataDir = process.env.DATA_DIR?.trim();
  if (dataDir) {
    const result = loadDataDirCached(dataDir);
    if (result.filesLoaded > 0) return result.sales;
  }
  return getMockSales();
}

function loadProducts(): Product[] {
  const dataDir = process.env.DATA_DIR?.trim();
  if (dataDir) {
    const result = loadDataDirCached(dataDir);
    if (result.filesLoaded > 0) return result.products;
  }
  return getMockProducts();
}

interface BaseQuery {
  siteFilter: SiteFilter;
  from: string;
  to: string;
  /** 카테고리 코드 prefix 로 매출을 필터링. 비어있으면 전체. */
  categoryPrefix?: string;
}

/**
 * productId → Product 맵을 데이터 적재 단위로 1회만 만들어 재사용한다.
 * (52k개 상품 맵을 집계 함수마다 새로 만들던 비용 제거)
 */
let _productsByIdCache: { src: Product[]; map: Map<string, Product> } | null =
  null;
function getProductsById(): Map<string, Product> {
  const products = loadProducts();
  if (_productsByIdCache && _productsByIdCache.src === products) {
    return _productsByIdCache.map;
  }
  const map = new Map(products.map((p) => [p.id, p]));
  _productsByIdCache = { src: products, map };
  return map;
}

/**
 * 카테고리 prefix 매칭. 콤마 구분이면 그중 하나라도 시작하면 통과(그룹).
 * 예: prefix="1501,1506" → 1501x 또는 1506x 둘 다 포함.
 */
function matchesCategoryPrefix(code: string, prefix: string): boolean {
  if (!prefix) return true;
  if (prefix.indexOf(",") === -1) return code.startsWith(prefix);
  return prefix.split(",").some((p) => p && code.startsWith(p));
}

function filterSales(query: BaseQuery, sales = loadSales()): Sale[] {
  // ISO 날짜("yyyy-MM-dd")는 사전식 비교가 곧 시간순 비교이므로
  // parseISO/isWithinInterval 없이 문자열로 직접 비교한다 (296k행 × 스캔 횟수만큼 절약).
  const { from, to } = query;
  const prefix = query.categoryPrefix?.trim() || "";
  const allSites = query.siteFilter === "all";
  return sales.filter((s) => {
    if (!allSites && s.siteId !== query.siteFilter) return false;
    if (s.date < from || s.date > to) return false;
    if (prefix && !matchesCategoryPrefix(s.categoryCode, prefix)) return false;
    return true;
  });
}

/**
 * URL searchParams 에서 유효한 카테고리 prefix 를 추출한다.
 *  - cat3/cat2/cat1 (드릴다운) > cat (토글)
 *  - 드릴다운이 토글 범위 밖이면 토글만 사용
 */
export function resolveCategoryPrefix(searchParams: {
  cat?: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
}): string | undefined {
  const top = searchParams.cat?.trim() || "";
  const drill =
    searchParams.cat3?.trim() ||
    searchParams.cat2?.trim() ||
    searchParams.cat1?.trim() ||
    "";
  if (drill && (!top || drill.startsWith(top))) return drill;
  return top || undefined;
}

/**
 * 로드된 데이터에 실제로 존재하는 중분류 (4자리) 카테고리 목록.
 * 사용자 데이터 자동 스캔으로 토글 옵션을 구성한다.
 */
export function getAvailableMidCategories(): {
  code: string;
  name: string;
}[] {
  const products = loadProducts();
  const codes = new Set<string>();
  for (const p of products) {
    const mid = getMidCategory(p.categoryCode);
    if (mid) codes.add(mid.code);
  }
  return [...codes]
    .map((code) => {
      const mid = getMidCategory(code);
      return { code, name: mid?.name ?? code };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

function bucketKey(date: string, period: Period): string {
  if (period === "day") return date; // s.date 가 이미 "yyyy-MM-dd"
  const d = parseISO(date);
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
  // 다나와는 한시적으로 데이터 수집 중단 — UI 에서는 SITES 기반으로 자동 숨김.
  // perSite 키는 타입 호환 위해 남겨두고 값은 항상 0.
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

/** [from, to] 가 걸치는 (연, 월) 목록. 월 단위 목표 합산에 사용. */
function monthsInRange(from: string, to: string): { year: number; month: number }[] {
  const f = parseISO(from);
  const t = parseISO(to);
  const out: { year: number; month: number }[] = [];
  let y = f.getFullYear();
  let m = f.getMonth(); // 0-based
  const endY = t.getFullYear();
  const endM = t.getMonth();
  while (y < endY || (y === endY && m <= endM)) {
    out.push({ year: y, month: m + 1 });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return out;
}

export interface Achievement {
  /** 기간에 해당하는 월 목표 합계(원). */
  target: number;
  /** 기간 실적 매출(원). */
  actual: number;
  /** actual / target. 1 = 100% 달성. */
  rate: number;
}

/**
 * 중분류 이름으로 목표표의 키를 찾는다.
 * 목표 파일 이름이 카테고리명과 약간 다를 수 있어(예: "건강식품" vs
 * "건강식품/홍삼") 정확 일치 → 유일한 접두 일치 순으로 관대하게 매칭한다.
 */
function findTargetKey(
  byName: Record<string, number[]>,
  midName: string,
): string | null {
  if (byName[midName]) return midName;
  const matches = Object.keys(byName).filter(
    (k) => k.startsWith(`${midName}/`) || midName.startsWith(`${k}/`),
  );
  return matches.length === 1 ? matches[0] : null;
}

/**
 * 월 목표 대비 달성율.
 *   - 목표 파일이 없거나 해당 카테고리 목표가 없으면 null.
 *   - categoryPrefix 가 소분류(4자리 초과)면 목표 단위가 없어 null.
 *   - categoryPrefix 미지정(전체)이면 데이터에 존재하는 중분류 목표 합산.
 */
export function getAchievement(query: BaseQuery): Achievement | null {
  const dataDir = process.env.DATA_DIR?.trim();
  if (!dataDir) return null;
  const table = loadTargetsCached(dataDir);
  const site = query.siteFilter === "danawa" ? "danawa" : "enuri";
  const byName = table[site];
  if (!byName || Object.keys(byName).length === 0) return null;

  const prefix = query.categoryPrefix?.trim() || "";
  const parts = prefix ? prefix.split(",").map((p) => p.trim()).filter(Boolean) : [];
  if (parts.some((p) => p.length > 4)) return null; // 소분류 드릴다운은 목표 단위 아님
  // 대상 중분류 이름: 선택된 코드들(그룹이면 여러 개), 미선택이면 데이터의 전체 중분류
  const midNames = parts.length
    ? (parts.map((p) => getMidCategory(p)?.name).filter(Boolean) as string[])
    : getAvailableMidCategories().map((c) => c.name);
  const keys = new Set<string>();
  for (const n of midNames) {
    const key = findTargetKey(byName, n);
    if (key) keys.add(key);
  }
  const names = [...keys];
  if (names.length === 0) return null;

  const months = monthsInRange(query.from, query.to);
  let target = 0;
  for (const name of names) {
    const arr = byName[name];
    if (!arr) continue;
    for (const { month } of months) target += arr[month - 1] ?? 0;
  }
  if (target <= 0) return null;

  const actual = getKpis(query).grossAmount;
  return { target, actual, rate: actual / target };
}

export function getMallBreakdown(
  query: BaseQuery & { manufacturer?: string },
): MallBreakdownRow[] {
  const manufacturer = query.manufacturer?.trim() || "";
  let sales = filterSales(query);
  if (manufacturer) {
    const productsById = getProductsById();
    sales = sales.filter((s) => {
      const p = productsById.get(s.productId);
      return (p?.manufacturer ?? "").trim() === manufacturer;
    });
  }
  // 1회 패스로 몰별 집계 (기존엔 MALLS(23) × sales 전체 필터 = 23패스)
  const agg = new Map<string, { gross: number; orders: number; commission: number }>();
  let total = 0;
  for (const s of sales) {
    total += s.grossAmount;
    const a = agg.get(s.mallId) ?? { gross: 0, orders: 0, commission: 0 };
    a.gross += s.grossAmount;
    a.orders += 1;
    a.commission += s.commission;
    agg.set(s.mallId, a);
  }

  const rows = MALLS.map((m) => {
    const a = agg.get(m.id);
    const gross = a?.gross ?? 0;
    return {
      mallId: m.id,
      mallName: m.name,
      grossAmount: gross,
      orders: a?.orders ?? 0,
      commission: a?.commission ?? 0,
      share: total === 0 ? 0 : gross / total,
    };
  });
  return rows.sort((a, b) => b.grossAmount - a.grossAmount);
}

export function getTopProducts(
  query: BaseQuery & { limit?: number; categoryPrefix?: string; mallId?: string; manufacturer?: string; nameContains?: string },
): ProductRankRow[] {
  const limit = query.limit ?? 10;
  const mallId = query.mallId?.trim() || "";
  const manufacturer = query.manufacturer?.trim() || "";
  const nameQuery = query.nameContains?.trim().toLowerCase() || "";
  const productsById = getProductsById();

  const rank = (q: BaseQuery) => {
    const sales = filterSales(q);
    const map = new Map<string, { gross: number; qty: number; commission: number }>();
    for (const s of sales) {
      if (mallId && s.mallId !== mallId) continue;
      const product = productsById.get(s.productId);
      if (manufacturer) {
        if (!product || (product.manufacturer ?? "").trim() !== manufacturer) continue;
      }
      if (nameQuery) {
        if (!product || !product.name.toLowerCase().includes(nameQuery)) continue;
      }
      const acc = map.get(s.productId) ?? { gross: 0, qty: 0, commission: 0 };
      acc.gross += s.grossAmount;
      acc.qty += s.quantity;
      acc.commission += s.commission;
      map.set(s.productId, acc);
    }
    return [...map.entries()]
      .map(([productId, agg]) => ({ productId, ...agg }))
      // 매출 동점일 때 productId 로 한 번 더 가른다. 그러지 않으면 순위가
      // Map 삽입 순서(=파일 파싱 순서)에 좌우돼, 같은 데이터라도 실행 방식에
      // 따라 노출되는 상품이 바뀐다.
      .sort((a, b) => b.gross - a.gross || a.productId.localeCompare(b.productId));
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
  const map = new Map<string, { name: string; gross: number }>();
  for (const s of sales) {
    // 카테고리 분류는 거래 단위 categoryCode 기준 — 같은 product 가 여러
    // 카테고리에 cross-listing 된 경우 product.categoryCode 는 첫 등장 카테고리
    // 하나만 가리켜서 다른 카테고리 매출이 그쪽으로 잘못 분류됨.
    const top = getTopCategory(s.categoryCode);
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

export interface SubCategoryRow {
  code: string;
  name: string;
  grossAmount: number;
  orders: number;
  averageOrderValue: number;
  growth: { yoy: GrowthMetric; mom: GrowthMetric };
}

function aggregateSubCategory(query: BaseQuery): Map<string, { name: string; gross: number; orders: number }> {
  const sales = filterSales(query);
  const map = new Map<string, { name: string; gross: number; orders: number }>();
  const OTHER_KEY = "__other__";
  for (const s of sales) {
    // 소분류 분류는 거래 단위 categoryCode 기준 (cross-listing 안전).
    const sub = getSubCategory(s.categoryCode);
    const key = sub?.code ?? OTHER_KEY;
    const name = sub?.name ?? "기타";
    const acc = map.get(key) ?? { name, gross: 0, orders: 0 };
    acc.gross += s.grossAmount;
    acc.orders += 1;
    map.set(key, acc);
  }
  return map;
}

export function getSubCategoryBreakdown(query: BaseQuery): SubCategoryRow[] {
  const current = aggregateSubCategory(query);
  const yoyPrev = aggregateSubCategory({ ...query, ...previousPeriodYoY(query) });
  const momPrev = aggregateSubCategory({ ...query, ...previousPeriodMoM(query) });
  return [...current.entries()]
    .map(([code, { name, gross, orders }]) => ({
      code,
      name,
      grossAmount: gross,
      orders,
      averageOrderValue: orders === 0 ? 0 : Math.round(gross / orders),
      growth: {
        yoy: computeGrowth(gross, yoyPrev.get(code)?.gross ?? 0),
        mom: computeGrowth(gross, momPrev.get(code)?.gross ?? 0),
      },
    }))
    .sort((a, b) => b.grossAmount - a.grossAmount);
}

export interface ManufacturerRow {
  manufacturer: string;
  grossAmount: number;
  orders: number;
  averageOrderValue: number;
  growth: { yoy: GrowthMetric; mom: GrowthMetric };
}

function aggregateManufacturer(
  query: BaseQuery,
): Map<string, { gross: number; orders: number }> {
  const sales = filterSales(query);
  const productsById = getProductsById();
  const map = new Map<string, { gross: number; orders: number }>();
  for (const s of sales) {
    const product = productsById.get(s.productId);
    const manu = (product?.manufacturer || "").trim() || "기타";
    const acc = map.get(manu) ?? { gross: 0, orders: 0 };
    acc.gross += s.grossAmount;
    acc.orders += 1;
    map.set(manu, acc);
  }
  return map;
}

export function getTopManufacturers(
  query: BaseQuery & { limit?: number; categoryPrefix?: string },
): ManufacturerRow[] {
  const limit = query.limit ?? 20;
  const current = aggregateManufacturer(query);
  const yoyPrev = aggregateManufacturer({ ...query, ...previousPeriodYoY(query) });
  const momPrev = aggregateManufacturer({ ...query, ...previousPeriodMoM(query) });
  return [...current.entries()]
    .map(([manufacturer, { gross, orders }]) => ({
      manufacturer,
      grossAmount: gross,
      orders,
      averageOrderValue: orders === 0 ? 0 : Math.round(gross / orders),
      growth: {
        yoy: computeGrowth(gross, yoyPrev.get(manufacturer)?.gross ?? 0),
        mom: computeGrowth(gross, momPrev.get(manufacturer)?.gross ?? 0),
      },
    }))
    .sort((a, b) => b.grossAmount - a.grossAmount)
    .slice(0, limit);
}

export interface MallCategoryCell {
  mallId: MallId;
  topCode: string;
  grossAmount: number;
}

export function getMallCategoryMatrix(query: BaseQuery): MallCategoryCell[] {
  const sales = filterSales(query);
  const map = new Map<string, MallCategoryCell>();
  for (const s of sales) {
    // cross-listing 안전 — 거래 단위 categoryCode 기준.
    const top = getTopCategory(s.categoryCode);
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

export function getLatestDataDate(): string | null {
  const sales = loadSales();
  if (sales.length === 0) return null;
  let max = sales[0].date;
  for (const s of sales) if (s.date > max) max = s.date;
  return max;
}

export function getDataLast30Range(): { from: string; to: string } {
  const latest = getLatestDataDate();
  if (!latest) return getCurrentMonthRange();
  const to = parseISO(latest);
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return {
    from: format(from, "yyyy-MM-dd"),
    to: format(to, "yyyy-MM-dd"),
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

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function resolveRange(
  from: string | undefined,
  to: string | undefined,
  fallback: () => { from: string; to: string } = getCurrentMonthRange,
): { from: string; to: string } {
  if (from && to && ISO_DATE_RE.test(from) && ISO_DATE_RE.test(to) && from <= to) {
    return { from, to };
  }
  return fallback();
}
