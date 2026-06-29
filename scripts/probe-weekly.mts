/**
 * 주간보고 데이터 추출 프로브
 * 실행: DATA_DIR=./data npx tsx scripts/probe-weekly.mts
 */
import {
  getKpis,
  getKpiGrowth,
  getAchievement,
  getSubCategoryBreakdown,
  getMallBreakdown,
  getTopProducts,
} from "../lib/data-source";

const FROM = "2026-06-01";
const TO = "2026-06-24"; // 최신 업로드 데이터 기준

const CATS: { code: string; name: string }[] = [
  { code: "1511", name: "라면/즉석밥/통조림" },
  { code: "1516", name: "냉장/냉동/간편식" },
  { code: "1504", name: "수산물" },
];

const BASE = { siteFilter: "all" as const, from: FROM, to: TO };

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

for (const cat of CATS) {
  const q = { ...BASE, categoryPrefix: cat.code };
  const kpi = getKpis(q);
  const growth = getKpiGrowth(q);
  const achievement = getAchievement(q);
  const subCats = getSubCategoryBreakdown(q).filter(r => r.grossAmount > 0);
  const malls = getMallBreakdown(q).filter(r => r.grossAmount > 0);
  const top5 = getTopProducts({ ...q, limit: 5 });

  // YoY 기간: 2025-06-01 ~ 2025-06-24
  const yoyFrom = `${parseInt(FROM.slice(0, 4)) - 1}${FROM.slice(4)}`;
  const yoyTo = `${parseInt(TO.slice(0, 4)) - 1}${TO.slice(4)}`;
  const yoyMalls = getMallBreakdown({ siteFilter: "all", from: yoyFrom, to: yoyTo, categoryPrefix: cat.code });
  const yoyMallMap = new Map(yoyMalls.map(m => [m.mallId, m.grossAmount]));

  console.log(`\n${"=".repeat(60)}`);
  console.log(`【 ${cat.name} (${cat.code}) 】 ${FROM} ~ ${TO}`);
  console.log(`${"=".repeat(60)}`);

  console.log(`\n[KPI]`);
  console.log(`  매출: ${fmt(kpi.grossAmount)}`);
  console.log(`  YoY: ${fmtPct(growth.yoy.percent)} (전년 ${fmt(growth.yoy.previous)}, ${fmtDelta(growth.yoy.delta)})`);
  console.log(`  MoM: ${fmtPct(growth.mom.percent)} (전월동기 ${fmt(growth.mom.previous)}, ${fmtDelta(growth.mom.delta)})`);
  if (achievement) {
    console.log(`  목표: ${fmt(achievement.target)} / 달성률: ${(achievement.rate * 100).toFixed(1)}%`);
  } else {
    console.log(`  목표: 데이터 없음`);
  }
  console.log(`  주문건수: ${kpi.orders.toLocaleString()}건`);

  console.log(`\n[소분류 Top 8]`);
  for (const r of subCats.slice(0, 8)) {
    console.log(`  ${r.name}: ${fmt(r.grossAmount)} | YoY ${fmtPct(r.growth.yoy.percent)} (${fmtDelta(r.growth.yoy.delta)})`);
  }

  console.log(`\n[쇼핑몰 Top 10 + YoY]`);
  const totalGross = kpi.grossAmount;
  for (const m of malls.slice(0, 10)) {
    const share = totalGross > 0 ? ((m.grossAmount / totalGross) * 100).toFixed(1) : "0.0";
    const yoyPrev = yoyMallMap.get(m.mallId) ?? 0;
    const delta = m.grossAmount - yoyPrev;
    const pct = yoyPrev === 0 ? null : (delta / yoyPrev) * 100;
    console.log(`  ${m.mallName}: ${fmt(m.grossAmount)} (${share}%) | YoY ${fmtPct(pct)} ${fmtDelta(delta)}`);
  }

  console.log(`\n[인기상품 Top 5]`);
  for (const r of top5) {
    console.log(`  ${r.rank}. ${r.product?.name ?? "(상품명없음)"} — ${fmt(r.grossAmount)} | YoY ${fmtPct(r.growth.yoy.percent)}`);
  }
}

console.log("\n\nDone.");
