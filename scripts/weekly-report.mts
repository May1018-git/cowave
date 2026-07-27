/**
 * 주간 매출 보고 데이터 추출.
 *
 * 기간: 최신 데이터가 있는 달의 1일 ~ 최신 데이터 날짜
 * 대상: 라면/즉석밥/통조림(1511), 냉장/냉동/간편식(1516), 수산물(1504)
 *
 * 실행: DATA_DIR=./data npx tsx scripts/weekly-report.mts
 *
 * 출력은 사람이 읽는 보고서가 아니라 보고서 작성용 원자료다.
 * 몰별 상위 상품·급증/급감 상품까지 뽑아 이슈 코멘트를 쓸 수 있게 한다.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  getKpis,
  getAchievement,
  getSubCategoryBreakdown,
  getMallBreakdown,
  getTopProducts,
} from "../lib/data-source";
import { getMallName } from "../lib/mall-map";

const DATA_DIR = process.env.DATA_DIR?.trim() || "./data";

/** 캐시에서 가장 최신 매출 일자를 찾는다. 없으면 오늘 기준으로 폴백. */
function latestDataDate(): string {
  const cachePath = join(DATA_DIR, ".cache", "parsed.json");
  if (existsSync(cachePath)) {
    const raw = JSON.parse(readFileSync(cachePath, "utf8")) as {
      dates?: string[];
    };
    const dates = raw.dates ?? [];
    if (dates.length > 0) return dates.slice().sort().at(-1)!;
  }
  return new Date().toISOString().slice(0, 10);
}

const TO = process.env.REPORT_TO?.trim() || latestDataDate();
const FROM = process.env.REPORT_FROM?.trim() || `${TO.slice(0, 7)}-01`;

/** YYYY-MM-DD 에서 연도만 1 빼기 (전년 동일자). */
function lastYear(d: string): string {
  return `${Number(d.slice(0, 4)) - 1}${d.slice(4)}`;
}

const YOY_FROM = lastYear(FROM);
const YOY_TO = lastYear(TO);

const CATS = [
  { code: "1511", name: "라면/즉석밥/통조림" },
  { code: "1516", name: "냉장/냉동/간편식" },
  { code: "1504", name: "수산물" },
];

const 억 = 100_000_000;
const 백만 = 1_000_000;

function fmtAmt(n: number): string {
  const a = Math.abs(n);
  if (a >= 억) return `${(n / 억).toFixed(1)}억`;
  // 1백만 미만은 백만 단위로 반올림하면 전부 "0백만" 이 되어 버린다.
  if (a < 백만) return `${Math.round(n / 10_000).toLocaleString("ko-KR")}만`;
  return `${Math.round(n / 백만)}백만`;
}
function fmtDelta(n: number): string {
  const s = n >= 0 ? "+" : "-";
  const a = Math.abs(n);
  if (a >= 억) return `${s}${(a / 억).toFixed(1)}억`;
  if (a < 백만) return `${s}${Math.round(a / 10_000).toLocaleString("ko-KR")}만`;
  return `${s}${Math.round(a / 백만)}백만`;
}
function fmtPct(p: number | null): string {
  if (p === null) return "신규";
  return `${p >= 0 ? "+" : ""}${p.toFixed(0)}%`;
}

const BASE = { siteFilter: "enuri" as const, from: FROM, to: TO };
const YOY_BASE = { siteFilter: "enuri" as const, from: YOY_FROM, to: YOY_TO };

console.log(`# 주간 매출 보고 원자료`);
console.log(`기간: ${FROM} ~ ${TO}`);
console.log(`전년 동일자: ${YOY_FROM} ~ ${YOY_TO}`);
console.log(`사이트: 에누리`);

for (const cat of CATS) {
  const q = { ...BASE, categoryPrefix: cat.code };
  const yq = { ...YOY_BASE, categoryPrefix: cat.code };

  const kpi = getKpis(q);
  const yoyKpi = getKpis(yq);
  const achievement = getAchievement(q);

  const cur = kpi.grossAmount;
  const prev = yoyKpi.grossAmount;
  const delta = cur - prev;
  const pct = prev === 0 ? null : (delta / prev) * 100;

  console.log(`\n\n${"=".repeat(70)}`);
  console.log(`## ${cat.name} (${cat.code})`);
  console.log(`${"=".repeat(70)}`);
  console.log(
    `총매출 ${fmtAmt(cur)} / YoY ${fmtPct(pct)} (${fmtDelta(delta)}) / 전년 ${fmtAmt(prev)}`,
  );
  if (achievement) {
    console.log(
      `목표 ${fmtAmt(achievement.target)} / 달성율 ${(achievement.rate * 100).toFixed(0)}%`,
    );
  } else {
    console.log(`목표: (없음)`);
  }
  console.log(`주문 ${kpi.orders.toLocaleString("ko-KR")}건`);

  // ---- 소분류 ----
  const subs = getSubCategoryBreakdown(q).filter((r) => r.grossAmount > 0);
  console.log(`\n### 소분류 (상위 6)`);
  for (const r of subs.slice(0, 6)) {
    console.log(
      `- ${r.name}: ${fmtAmt(r.grossAmount)} / YoY ${fmtPct(r.growth.yoy.percent)} (${fmtDelta(r.growth.yoy.delta)})`,
    );
  }

  // ---- 쇼핑몰 ----
  const malls = getMallBreakdown(q).filter((r) => r.grossAmount > 0);
  const yoyMalls = getMallBreakdown(yq);
  const yoyMallAmt = new Map(yoyMalls.map((m) => [m.mallId, m.grossAmount]));

  // 전년에 매출이 있었는데 올해 0인 몰 (채널 단절).
  // 전년 1백만 미만은 노이즈라 제외 — 보고할 만한 채널만 남긴다.
  const deadMalls = yoyMalls
    .filter(
      (m) =>
        m.grossAmount >= 백만 && !malls.some((c) => c.mallId === m.mallId),
    )
    .sort((a, b) => b.grossAmount - a.grossAmount);

  console.log(`\n### 쇼핑몰`);
  for (const m of deadMalls.slice(0, 3)) {
    console.log(
      `- ${m.mallName}: 0원 / YoY -100% (${fmtDelta(-m.grossAmount)}) ▶ 채널 단절`,
    );
  }

  for (const m of malls.slice(0, 6)) {
    const mPrev = yoyMallAmt.get(m.mallId) ?? 0;
    const mDelta = m.grossAmount - mPrev;
    const mPct = mPrev === 0 ? null : (mDelta / mPrev) * 100;
    console.log(
      `- ${m.mallName}: ${fmtAmt(m.grossAmount)} / YoY ${fmtPct(mPct)} (${fmtDelta(mDelta)}) / 점유 ${(m.share * 100).toFixed(0)}%`,
    );

    // 몰별 상위 상품 + 각 상품 YoY
    const top = getTopProducts({ ...q, mallId: m.mallId, limit: 4 });
    for (const p of top) {
      const g = p.growth.yoy;
      const tag = g.previous === 0 ? "신규" : `${fmtPct(g.percent)} ${fmtDelta(g.delta)}`;
      console.log(
        `    · ${p.product.name}${p.product.manufacturer ? ` [${p.product.manufacturer}]` : ""}: ${fmtAmt(p.grossAmount)} (${tag}) ${p.quantity.toLocaleString()}개`,
      );
    }
  }

  // ---- 상품 레벨 이슈: 카테고리 전체 급증/급감 ----
  // 카테고리 규모가 작으면 절대 임계값(3백만)에 걸리는 상품이 1~2개뿐이라
  // 이슈 코멘트 근거가 부족해진다. 차액 절대값 상위 5개를 그냥 뽑는다.
  const allProducts = getTopProducts({ ...q, limit: 300 });

  const gainers = allProducts
    .filter((p) => p.growth.yoy.delta > 0)
    .sort((a, b) => b.growth.yoy.delta - a.growth.yoy.delta)
    .slice(0, 5);
  const losers = allProducts
    .filter((p) => p.growth.yoy.delta < 0)
    .sort((a, b) => a.growth.yoy.delta - b.growth.yoy.delta)
    .slice(0, 5);

  console.log(`\n### 상품 이슈 — 증가 TOP5 (YoY 차액 기준)`);
  for (const p of gainers) {
    const g = p.growth.yoy;
    console.log(
      `- ${p.product.name}${p.product.manufacturer ? ` [${p.product.manufacturer}]` : ""}: ${fmtAmt(p.grossAmount)} (${g.previous === 0 ? "신규" : fmtPct(g.percent)}, ${fmtDelta(g.delta)})`,
    );
  }

  console.log(`\n### 상품 이슈 — 감소 TOP5 (YoY 차액 기준)`);
  for (const p of losers) {
    const g = p.growth.yoy;
    console.log(
      `- ${p.product.name}${p.product.manufacturer ? ` [${p.product.manufacturer}]` : ""}: ${fmtAmt(p.grossAmount)} (${fmtPct(g.percent)}, ${fmtDelta(g.delta)})`,
    );
  }

  // 전년 있었는데 올해 사라진 상품 (이탈)
  const yoyProducts = getTopProducts({ ...yq, limit: 200 });
  const curIds = new Set(allProducts.map((p) => p.product.id));
  const gone = yoyProducts
    .filter((p) => !curIds.has(p.product.id) && p.grossAmount >= 백만)
    .slice(0, 5);
  if (gone.length > 0) {
    console.log(`\n### 상품 이슈 — 올해 매출 소멸 (전년 1백만↑)`);
    for (const p of gone) {
      console.log(
        `- ${p.product.name}${p.product.manufacturer ? ` [${p.product.manufacturer}]` : ""}: 전년 ${fmtAmt(p.grossAmount)} → 0`,
      );
    }
  }
}

console.log(`\n\n(끝)`);
