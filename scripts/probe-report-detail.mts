/**
 * 주간보고 상세 데이터 추출 (쇼핑몰별 Top 상품 포함)
 * 실행: npx tsx scripts/probe-report-detail.mts
 */
import { readFileSync } from "node:fs";
import { getSubCategory } from "../lib/category-map";

const CACHE = "./data/.cache/parsed.json";
const FROM = "2026-06-01";
const TO = "2026-06-24";
const YOY_FROM = "2025-06-01";
const YOY_TO = "2025-06-24";
const MOM_FROM = "2026-05-01";
const MOM_TO = "2026-05-24";

const MALL_NAMES: Record<string, string> = {
  "7861": "쿠팡", "6875": "스마트스토어", "4027": "옥션", "536": "G마켓",
  "5910": "11번가", "49": "롯데ON", "47": "신세계몰", "6361": "홈플러스",
  "57": "현대Hmall", "374": "이마트몰", "6193": "동원몰", "75": "GS SHOP",
  "44244": "배민상회", "974": "NS몰", "9011": "SK스토아", "663": "롯데홈쇼핑",
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

console.error("캐시 로드 중...");
const raw = JSON.parse(readFileSync(CACHE, "utf8")) as CacheFile;
const { dates, sites, products, cats, sales: rawSales } = raw;
const productMap = new Map(products.map(p => [p.id, p]));

type Sale = { date: string; productId: string; mallId: string; grossAmount: number; categoryCode: string };
const sales: Sale[] = rawSales.map(r => ({
  date: dates[r[0]],
  productId: products[r[2]].id,
  mallId: r[3],
  grossAmount: r[5],
  categoryCode: cats?.[r[7]] ?? "",
}));

function filterSales(catPrefix: string, from: string, to: string) {
  return sales.filter(s => s.date >= from && s.date <= to && s.categoryCode.startsWith(catPrefix));
}

function amtB(n: number) { return Math.round(n / 1_000_000) + "백만"; }
function pct(cur: number, prev: number): string {
  if (prev === 0) return "(신규)";
  const p = ((cur - prev) / prev) * 100;
  const d = Math.round((cur - prev) / 1_000_000);
  return `${p >= 0 ? "+" : ""}${p.toFixed(0)}% (${d >= 0 ? "+" : ""}${d}백만)`;
}

const CATS = [
  { code: "1511", name: "라면/즉석밥/통조림", emoji: "🍜" },
  { code: "1516", name: "냉장/냉동/간편식", emoji: "🍱" },
  { code: "1504", name: "수산물", emoji: "🐟" },
];

for (const cat of CATS) {
  const cur = filterSales(cat.code, FROM, TO);
  const yoy = filterSales(cat.code, YOY_FROM, YOY_TO);
  const mom = filterSales(cat.code, MOM_FROM, MOM_TO);

  const curAmt = cur.reduce((s, r) => s + r.grossAmount, 0);
  const yoyAmt = yoy.reduce((s, r) => s + r.grossAmount, 0);

  console.log(`\n${cat.emoji} ${cat.name} (${cat.code})`);

  // 소분류
  const subCur = new Map<string, { name: string; amt: number }>();
  const subYoy = new Map<string, number>();
  for (const s of cur) {
    const sub = getSubCategory(s.categoryCode);
    const key = sub?.code ?? "__other__";
    const name = sub?.name ?? "기타";
    const acc = subCur.get(key) ?? { name, amt: 0 };
    acc.amt += s.grossAmount;
    subCur.set(key, acc);
  }
  for (const s of yoy) {
    const sub = getSubCategory(s.categoryCode);
    const key = sub?.code ?? "__other__";
    subYoy.set(key, (subYoy.get(key) ?? 0) + s.grossAmount);
  }
  const subList = [...subCur.entries()]
    .map(([k, v]) => ({ code: k, name: v.name, cur: v.amt, yoy: subYoy.get(k) ?? 0 }))
    .filter(r => r.cur > 0)
    .sort((a, b) => b.cur - a.cur);

  console.log(`\n[소분류]`);
  for (const r of subList) {
    console.log(`  ${r.name}: ${amtB(r.cur)} / YoY ${pct(r.cur, r.yoy)}`);
  }

  // 쇼핑몰별 + Top3 상품
  const mallCur = new Map<string, number>();
  const mallYoy = new Map<string, number>();
  const mallProd = new Map<string, Map<string, number>>(); // mallId → productId → amt

  for (const s of cur) {
    mallCur.set(s.mallId, (mallCur.get(s.mallId) ?? 0) + s.grossAmount);
    if (!mallProd.has(s.mallId)) mallProd.set(s.mallId, new Map());
    const pm = mallProd.get(s.mallId)!;
    pm.set(s.productId, (pm.get(s.productId) ?? 0) + s.grossAmount);
  }
  for (const s of yoy) {
    mallYoy.set(s.mallId, (mallYoy.get(s.mallId) ?? 0) + s.grossAmount);
  }

  // 쿠팡 YoY (항상 출력)
  const coupangYoy = mallYoy.get("7861") ?? 0;

  const mallList = [...mallCur.entries()]
    .map(([id, amt]) => ({ id, name: MALL_NAMES[id] ?? id, cur: amt, yoy: mallYoy.get(id) ?? 0 }))
    .sort((a, b) => b.cur - a.cur);

  console.log(`\n[쇼핑몰]`);
  // 쿠팡 (0원이면 상단 표시)
  if (!mallCur.has("7861") && coupangYoy > 0) {
    console.log(`  쿠팡: 0원 / YoY -100% (-${Math.round(coupangYoy / 1_000_000)}백만) ▶ 채널 단절`);
  }

  for (const m of mallList.filter(r => r.cur > 0)) {
    const growth = m.yoy > 0 ? ((m.cur - m.yoy) / m.yoy * 100) : null;
    const indicator = growth !== null && growth > 20 ? " ▲" : "";
    console.log(`  ${m.name}: ${amtB(m.cur)} / YoY ${pct(m.cur, m.yoy)}${indicator}`);
    // Top 3 상품
    const pm = mallProd.get(m.id) ?? new Map<string, number>();
    const top3 = [...pm.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    for (const [pid, amt] of top3) {
      const p = productMap.get(pid);
      const name = p?.name ?? pid;
      const mfr = p?.manufacturer ?? "";
      // YoY for this product in this mall
      const yoyProdAmt = yoy
        .filter(s => s.productId === pid && s.mallId === m.id)
        .reduce((sum, s) => sum + s.grossAmount, 0);
      const prodPct = yoyProdAmt === 0 ? "(신규)" : pct(amt, yoyProdAmt);
      console.log(`    ${name}${mfr ? " [" + mfr + "]" : ""}: ${amtB(amt)} ${prodPct}`);
    }
  }
}

console.error("\nDone.");
