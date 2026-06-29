/**
 * 주간보고 데이터 추출 — parsed.json 캐시 직독 (빠름)
 * 실행: npx tsx scripts/probe-weekly-fast.mts
 */
import { readFileSync } from "node:fs";
import { getSubCategory } from "../lib/category-map";
import { MALLS } from "../lib/mall-map";

const CACHE = "./data/.cache/parsed.json";
const FROM = "2026-06-01";
const TO = "2026-06-24";
const YOY_FROM = "2025-06-01";
const YOY_TO = "2025-06-24";

type Sale = {
  date: string;
  siteId: string;
  productId: string;
  mallId: string;
  quantity: number;
  grossAmount: number;
  categoryCode: string;
};

interface CacheFile {
  version: number;
  manifest: { name: string; size: number }[];
  products: { id: string; name: string; categoryCode: string; manufacturer?: string; modelNumber?: string }[];
  dates: string[];
  sites: string[];
  cats: string[];
  sales: [number, number, number, string, number, number, number, number][];
}

console.log("캐시 로드 중...");
const raw = JSON.parse(readFileSync(CACHE, "utf8")) as CacheFile;
const { dates, sites, products, cats, sales: rawSales } = raw;
const productMap = new Map(products.map(p => [p.id, p]));

const sales: Sale[] = rawSales.map((r, i) => ({
  id: `s${i}`,
  date: dates[r[0]],
  siteId: sites[r[1]],
  productId: products[r[2]].id,
  mallId: r[3],
  quantity: r[4],
  grossAmount: r[5],
  commission: r[6],
  categoryCode: cats?.[r[7]] ?? "",
}));

console.log(`총 sales: ${sales.length.toLocaleString()}`);

const mallNameMap = new Map(MALLS.map(m => [m.id, m.name]));

function fmt(n: number): string {
  return Math.round(n / 10000).toLocaleString("ko-KR") + "만원";
}
function fmtPct(p: number | null): string {
  if (p === null) return "신규";
  return (p >= 0 ? "+" : "") + p.toFixed(1) + "%";
}
function fmtDelta(d: number): string {
  const sign = d >= 0 ? "▲" : "▼";
  return `${sign}${Math.abs(Math.round(d / 10000)).toLocaleString()}만원`;
}

function filterSales(catPrefix: string, from: string, to: string) {
  return sales.filter(s =>
    s.date >= from && s.date <= to && s.categoryCode.startsWith(catPrefix)
  );
}

const CATS = [
  { code: "1511", name: "라면/즉석밥/통조림" },
  { code: "1516", name: "냉장/냉동/간편식" },
  { code: "1504", name: "수산물" },
];

for (const cat of CATS) {
  const cur = filterSales(cat.code, FROM, TO);
  const yoy = filterSales(cat.code, YOY_FROM, YOY_TO);
  // MoM: 2026-05-01 ~ 2026-05-24
  const mom = filterSales(cat.code, "2026-05-01", "2026-05-24");

  const curAmt = cur.reduce((s, r) => s + r.grossAmount, 0);
  const yoyAmt = yoy.reduce((s, r) => s + r.grossAmount, 0);
  const momAmt = mom.reduce((s, r) => s + r.grossAmount, 0);

  const yoyPct = yoyAmt === 0 ? null : ((curAmt - yoyAmt) / yoyAmt) * 100;
  const momPct = momAmt === 0 ? null : ((curAmt - momAmt) / momAmt) * 100;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`【 ${cat.name} (${cat.code}) 】 ${FROM} ~ ${TO}`);
  console.log(`${"=".repeat(60)}`);

  console.log(`\n[KPI]`);
  console.log(`  현재 매출: ${fmt(curAmt)}`);
  console.log(`  전년 동기: ${fmt(yoyAmt)}`);
  console.log(`  YoY: ${fmtPct(yoyPct)} (${fmtDelta(curAmt - yoyAmt)})`);
  console.log(`  전월 동기: ${fmt(momAmt)}`);
  console.log(`  MoM: ${fmtPct(momPct)} (${fmtDelta(curAmt - momAmt)})`);
  console.log(`  주문건수: ${cur.length.toLocaleString()}건`);

  // 소분류
  const subMap = new Map<string, { name: string; cur: number; yoy: number }>();
  for (const s of cur) {
    const sub = getSubCategory(s.categoryCode);
    const key = sub?.code ?? "__other__";
    const name = sub?.name ?? "기타";
    const acc = subMap.get(key) ?? { name, cur: 0, yoy: 0 };
    acc.cur += s.grossAmount;
    subMap.set(key, acc);
  }
  for (const s of yoy) {
    const sub = getSubCategory(s.categoryCode);
    const key = sub?.code ?? "__other__";
    const name = sub?.name ?? "기타";
    const acc = subMap.get(key) ?? { name, cur: 0, yoy: 0 };
    acc.yoy += s.grossAmount;
    subMap.set(key, acc);
  }
  const subList = [...subMap.entries()]
    .map(([k, v]) => ({ code: k, ...v }))
    .sort((a, b) => b.cur - a.cur);

  console.log(`\n[소분류]`);
  for (const r of subList.filter(r => r.cur > 0)) {
    const pct = r.yoy === 0 ? null : ((r.cur - r.yoy) / r.yoy) * 100;
    console.log(`  ${r.name}: ${fmt(r.cur)} | YoY ${fmtPct(pct)} (${fmtDelta(r.cur - r.yoy)})`);
  }

  // 쇼핑몰
  const mallCur = new Map<string, number>();
  const mallYoy = new Map<string, number>();
  for (const s of cur) mallCur.set(s.mallId, (mallCur.get(s.mallId) ?? 0) + s.grossAmount);
  for (const s of yoy) mallYoy.set(s.mallId, (mallYoy.get(s.mallId) ?? 0) + s.grossAmount);

  const mallList = [...mallCur.entries()]
    .map(([id, curAmt]) => ({ id, name: mallNameMap.get(id) ?? id, curAmt, yoyAmt: mallYoy.get(id) ?? 0 }))
    .sort((a, b) => b.curAmt - a.curAmt);

  console.log(`\n[쇼핑몰 Top 10]`);
  for (const m of mallList.slice(0, 10)) {
    const share = curAmt > 0 ? ((m.curAmt / curAmt) * 100).toFixed(1) : "0.0";
    const pct = m.yoyAmt === 0 ? null : ((m.curAmt - m.yoyAmt) / m.yoyAmt) * 100;
    console.log(`  ${m.name}: ${fmt(m.curAmt)} (${share}%) | YoY ${fmtPct(pct)} ${fmtDelta(m.curAmt - m.yoyAmt)}`);
  }

  // Top 5 상품
  const prodMap = new Map<string, { name: string; cur: number; yoy: number }>();
  for (const s of cur) {
    const p = productMap.get(s.productId);
    const name = p?.name ?? s.productId;
    const acc = prodMap.get(s.productId) ?? { name, cur: 0, yoy: 0 };
    acc.cur += s.grossAmount;
    prodMap.set(s.productId, acc);
  }
  for (const s of yoy) {
    const p = productMap.get(s.productId);
    const name = p?.name ?? s.productId;
    const acc = prodMap.get(s.productId) ?? { name, cur: 0, yoy: 0 };
    acc.yoy += s.grossAmount;
    prodMap.set(s.productId, acc);
  }
  const top5 = [...prodMap.entries()]
    .sort((a, b) => b[1].cur - a[1].cur)
    .slice(0, 5);

  console.log(`\n[인기상품 Top 5]`);
  top5.forEach(([id, v], i) => {
    const pct = v.yoy === 0 ? null : ((v.cur - v.yoy) / v.yoy) * 100;
    console.log(`  ${i + 1}. ${v.name} — ${fmt(v.cur)} | YoY ${fmtPct(pct)}`);
  });
}

console.log("\n\nDone.");
