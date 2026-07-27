/**
 * 냉장/냉동/간편식(1516) 역신장 원인 진단.
 *
 * YoY 증감을 4가지 요인으로 분해한다:
 *   이탈  — 전년 매출 있었는데 올해 0     (카탈로그/매칭 이슈)
 *   감소  — 양년 모두 있고 올해 하락       (경쟁력 이슈)
 *   증가  — 양년 모두 있고 올해 상승       (유지되는 동력)
 *   신규  — 올해만 매출                    (소싱 성과)
 *
 * 쿠팡(7861) 채널 단절 효과를 분리해 "구조적 건강도"를 따로 본다.
 *
 * 실행: npx tsx scripts/diagnose-1516.mts
 */
import { readFileSync } from "node:fs";
import { getSubCategory } from "../lib/category-map";
import { getMallName } from "../lib/mall-map";

const CACHE = "./data/.cache/parsed.json";
const CAT = "1516";
const COUPANG = "7861";

// 1516 의 2025 데이터는 5월부터 존재한다. 연초 누적으로 비교하면
// 전년 1~4월이 0이라 YoY 가 허수로 부풀어오른다.
// 양년 모두 데이터가 있는 5/1~7/22 로 맞춰 like-for-like 비교한다.
const FROM = "2026-05-01";
const TO = "2026-07-22";
const YOY_FROM = "2025-05-01";
const YOY_TO = "2025-07-22";

interface CacheFile {
  products: { id: string; name: string; manufacturer?: string }[];
  dates: string[];
  cats: string[];
  sales: [number, number, number, string, number, number, number, number][];
}

const raw = JSON.parse(readFileSync(CACHE, "utf8")) as CacheFile;
const { dates, products, cats, sales: rawSales } = raw;

type Row = {
  date: string;
  pid: string;
  name: string;
  mfr: string;
  mall: string;
  amt: number;
  qty: number;
  code: string;
};

const rows: Row[] = [];
for (const r of rawSales) {
  const code = cats?.[r[7]] ?? "";
  if (!code.startsWith(CAT)) continue;
  const date = dates[r[0]];
  const inCur = date >= FROM && date <= TO;
  const inYoy = date >= YOY_FROM && date <= YOY_TO;
  if (!inCur && !inYoy) continue;
  const p = products[r[2]];
  rows.push({
    date,
    pid: p.id,
    name: p.name,
    mfr: p.manufacturer ?? "",
    mall: r[3],
    amt: r[5],
    qty: r[4],
    code,
  });
}

const isCur = (d: string) => d >= FROM && d <= TO;
const 백만 = 1_000_000;
const 억 = 100_000_000;

function amt(n: number): string {
  const a = Math.abs(n);
  if (a >= 억) return `${(n / 억).toFixed(2)}억`;
  return `${Math.round(n / 백만)}백만`;
}
function delta(n: number): string {
  const s = n >= 0 ? "+" : "-";
  const a = Math.abs(n);
  if (a >= 억) return `${s}${(a / 억).toFixed(2)}억`;
  return `${s}${Math.round(a / 백만)}백만`;
}
function pctOf(n: number, base: number): string {
  if (base === 0) return "—";
  return `${((n / base) * 100).toFixed(0)}%`;
}

function subName(code: string): string {
  return getSubCategory(code)?.name ?? "기타";
}

/** 상품 단위로 (전년, 올해) 매출을 모아 요인 분해. */
function decompose(filter: (r: Row) => boolean) {
  const byProduct = new Map<string, { cur: number; prev: number; name: string; mfr: string }>();
  for (const r of rows) {
    if (!filter(r)) continue;
    const acc = byProduct.get(r.pid) ?? { cur: 0, prev: 0, name: r.name, mfr: r.mfr };
    if (isCur(r.date)) acc.cur += r.amt;
    else acc.prev += r.amt;
    byProduct.set(r.pid, acc);
  }
  let lost = 0, declined = 0, grew = 0, isNew = 0;
  let lostN = 0, declinedN = 0, grewN = 0, newN = 0;
  for (const v of byProduct.values()) {
    if (v.prev > 0 && v.cur === 0) { lost -= v.prev; lostN++; }
    else if (v.prev === 0 && v.cur > 0) { isNew += v.cur; newN++; }
    else if (v.cur < v.prev) { declined += v.cur - v.prev; declinedN++; }
    else if (v.cur > v.prev) { grew += v.cur - v.prev; grewN++; }
  }
  const cur = [...byProduct.values()].reduce((s, v) => s + v.cur, 0);
  const prev = [...byProduct.values()].reduce((s, v) => s + v.prev, 0);
  const curSku = [...byProduct.values()].filter((v) => v.cur > 0).length;
  const prevSku = [...byProduct.values()].filter((v) => v.prev > 0).length;
  return { cur, prev, lost, declined, grew, isNew, lostN, declinedN, grewN, newN, curSku, prevSku, byProduct };
}

console.log(`# 냉장/냉동/간편식(1516) 역신장 진단`);
console.log(`기간 ${FROM} ~ ${TO} vs 전년 동기\n`);

// ---------- 1. 전체 & 쿠팡 분리 ----------
const all = decompose(() => true);
const exCoupang = decompose((r) => r.mall !== COUPANG);

console.log(`${"=".repeat(72)}`);
console.log(`## 1. 쿠팡 채널 단절 효과 분리`);
console.log(`${"=".repeat(72)}`);
console.log(`전체     : ${amt(all.prev)} → ${amt(all.cur)} (${delta(all.cur - all.prev)}, ${pctOf(all.cur - all.prev, all.prev)})`);
console.log(`쿠팡 제외: ${amt(exCoupang.prev)} → ${amt(exCoupang.cur)} (${delta(exCoupang.cur - exCoupang.prev)}, ${pctOf(exCoupang.cur - exCoupang.prev, exCoupang.prev)})`);
const coupangLoss = (all.prev - exCoupang.prev);
console.log(`\n쿠팡 전년 매출 ${amt(coupangLoss)} → 올해 0`);
console.log(`전체 감소분 중 쿠팡 기여: ${pctOf(coupangLoss, all.prev - all.cur)}`);

// ---------- 2. 요인 분해 (쿠팡 제외) ----------
console.log(`\n${"=".repeat(72)}`);
console.log(`## 2. 쿠팡 제외 기준 증감 요인 분해`);
console.log(`${"=".repeat(72)}`);
const e = exCoupang;
console.log(`이탈(전년→0) : ${delta(e.lost)}  · ${e.lostN}개 SKU`);
console.log(`감소(하락)   : ${delta(e.declined)}  · ${e.declinedN}개 SKU`);
console.log(`증가(상승)   : ${delta(e.grew)}  · ${e.grewN}개 SKU`);
console.log(`신규(올해만) : ${delta(e.isNew)}  · ${e.newN}개 SKU`);
console.log(`순증감       : ${delta(e.lost + e.declined + e.grew + e.isNew)}`);
console.log(`\n판매 SKU 수  : ${e.prevSku.toLocaleString()}개 → ${e.curSku.toLocaleString()}개 (${delta(e.curSku - e.prevSku).replace(/백만|억/, "")}개)`);

// ---------- 3. 소분류별 ----------
console.log(`\n${"=".repeat(72)}`);
console.log(`## 3. 소분류별 진단 (쿠팡 제외)`);
console.log(`${"=".repeat(72)}`);

const subCodes = new Set<string>();
for (const r of rows) subCodes.add(subName(r.code));

type SubStat = ReturnType<typeof decompose> & { name: string };
const subStats: SubStat[] = [];
for (const sn of subCodes) {
  const d = decompose((r) => r.mall !== COUPANG && subName(r.code) === sn);
  if (d.prev === 0 && d.cur === 0) continue;
  subStats.push({ ...d, name: sn });
}
subStats.sort((a, b) => (a.cur - a.prev) - (b.cur - b.prev));

console.log(
  `${"소분류".padEnd(20)} ${"올해".padStart(8)} ${"YoY차액".padStart(9)} ${"이탈".padStart(8)} ${"감소".padStart(8)} ${"신규".padStart(8)} ${"SKU".padStart(11)}`,
);
console.log("-".repeat(80));
for (const s of subStats) {
  const d = s.cur - s.prev;
  console.log(
    `${s.name.padEnd(20)} ${amt(s.cur).padStart(8)} ${delta(d).padStart(9)} ${delta(s.lost).padStart(8)} ${delta(s.declined).padStart(8)} ${delta(s.isNew).padStart(8)} ${`${s.prevSku}→${s.curSku}`.padStart(11)}`,
  );
}

// ---------- 4. 상위 손실 소분류 상세 ----------
console.log(`\n${"=".repeat(72)}`);
console.log(`## 4. 손실 상위 3개 소분류 — 무엇이 빠졌나`);
console.log(`${"=".repeat(72)}`);

for (const s of subStats.slice(0, 3)) {
  const d = s.cur - s.prev;
  console.log(`\n### ${s.name} (${delta(d)})`);
  console.log(`올해 ${amt(s.cur)} / 전년 ${amt(s.prev)} · SKU ${s.prevSku}→${s.curSku}`);
  console.log(`  이탈 ${delta(s.lost)}(${s.lostN}) · 감소 ${delta(s.declined)}(${s.declinedN}) · 증가 ${delta(s.grew)}(${s.grewN}) · 신규 ${delta(s.isNew)}(${s.newN})`);

  const items = [...s.byProduct.values()];
  const lostTop = items.filter((v) => v.prev > 0 && v.cur === 0).sort((a, b) => b.prev - a.prev).slice(0, 6);
  const decTop = items.filter((v) => v.prev > 0 && v.cur > 0 && v.cur < v.prev).sort((a, b) => (a.cur - a.prev) - (b.cur - b.prev)).slice(0, 6);
  const newTop = items.filter((v) => v.prev === 0 && v.cur > 0).sort((a, b) => b.cur - a.cur).slice(0, 5);

  if (lostTop.length) {
    console.log(`  [이탈 상품 TOP]`);
    for (const v of lostTop) console.log(`    · ${v.name}${v.mfr ? ` [${v.mfr}]` : ""}: 전년 ${amt(v.prev)} → 0`);
  }
  if (decTop.length) {
    console.log(`  [감소 상품 TOP]`);
    for (const v of decTop) console.log(`    · ${v.name}${v.mfr ? ` [${v.mfr}]` : ""}: ${amt(v.prev)} → ${amt(v.cur)} (${delta(v.cur - v.prev)})`);
  }
  if (newTop.length) {
    console.log(`  [신규 진입 TOP]`);
    for (const v of newTop) console.log(`    · ${v.name}${v.mfr ? ` [${v.mfr}]` : ""}: ${amt(v.cur)}`);
  }
}

// ---------- 5. 소분류 × 몰 ----------
console.log(`\n${"=".repeat(72)}`);
console.log(`## 5. 손실 상위 3개 소분류 × 몰별 (쿠팡 제외)`);
console.log(`${"=".repeat(72)}`);

for (const s of subStats.slice(0, 3)) {
  console.log(`\n### ${s.name}`);
  const malls = new Set<string>();
  for (const r of rows) if (r.mall !== COUPANG && subName(r.code) === s.name) malls.add(r.mall);
  const mrows: { mall: string; cur: number; prev: number }[] = [];
  for (const m of malls) {
    const d = decompose((r) => r.mall === m && subName(r.code) === s.name);
    if (d.cur === 0 && d.prev === 0) continue;
    mrows.push({ mall: m, cur: d.cur, prev: d.prev });
  }
  mrows.sort((a, b) => b.cur - a.cur);
  for (const m of mrows.slice(0, 6)) {
    const d = m.cur - m.prev;
    console.log(`  ${getMallName(m.mall).padEnd(10)} ${amt(m.cur).padStart(8)} ← ${amt(m.prev).padStart(8)}  ${delta(d).padStart(9)} ${pctOf(d, m.prev).padStart(6)}`);
  }
}

// ---------- 6. 제조사 이탈 ----------
console.log(`\n${"=".repeat(72)}`);
console.log(`## 6. 제조사 단위 이탈/감소 TOP (쿠팡 제외)`);
console.log(`${"=".repeat(72)}`);

const byMfr = new Map<string, { cur: number; prev: number }>();
for (const r of rows) {
  if (r.mall === COUPANG) continue;
  const k = r.mfr || "(제조사없음)";
  const acc = byMfr.get(k) ?? { cur: 0, prev: 0 };
  if (isCur(r.date)) acc.cur += r.amt;
  else acc.prev += r.amt;
  byMfr.set(k, acc);
}
const mfrRows = [...byMfr.entries()]
  .map(([k, v]) => ({ mfr: k, ...v, d: v.cur - v.prev }))
  .filter((v) => v.prev >= 5 * 백만 || v.cur >= 5 * 백만)
  .sort((a, b) => a.d - b.d);

console.log(`\n[감소 TOP 10]`);
for (const m of mfrRows.slice(0, 10)) {
  console.log(`  ${m.mfr.padEnd(18)} ${amt(m.prev).padStart(8)} → ${amt(m.cur).padStart(8)}  ${delta(m.d).padStart(9)} ${pctOf(m.d, m.prev).padStart(6)}`);
}
console.log(`\n[증가 TOP 10]`);
for (const m of mfrRows.slice().reverse().slice(0, 10)) {
  console.log(`  ${m.mfr.padEnd(18)} ${amt(m.prev).padStart(8)} → ${amt(m.cur).padStart(8)}  ${delta(m.d).padStart(9)} ${pctOf(m.d, m.prev).padStart(6)}`);
}

console.log(`\n(끝)`);
