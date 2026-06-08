import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadXlsxFile } from "../lib/loaders/xlsx.js";

const DATA_DIR = join(import.meta.dirname, "../data/에누리");

interface AggRow {
  name: string;
  gross: number;
  units: number;
}

function loadPeriod(from: string, to: string): Map<string, AggRow> {
  const map = new Map<string, AggRow>();
  const catNameMap: Record<string, string> = {
    "1501": "건강식품,홍삼",
    "1502": "농산물",
    "1503": "축산물",
    "1504": "수산물",
    "1505": "커피,차",
    "1506": "헬스,다이어트,이너뷰티",
    "1507": "오일,소스,양념",
    "1508": "과자,초콜릿,디저트",
    "1511": "라면,즉석밥,통조림",
    "1513": "생수,음료,주류",
    "1516": "냉장,냉동,간편식",
  };

  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".xls") && f.includes("GMV_RAWDATA"));

  for (const filename of files) {
    // extract date range from filename
    const m = filename.match(/GMV_RAWDATA_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})/);
    if (!m) continue;
    const [, fileFrom, fileTo] = m;
    // include if file window overlaps [from, to]
    if (fileTo < from || fileFrom > to) continue;

    const buf = readFileSync(join(DATA_DIR, filename));
    const { sales } = loadXlsxFile(buf, filename, "enuri");

    for (const s of sales) {
      if (s.date < from || s.date > to) continue;
      const code = s.categoryCode.slice(0, 4);
      const acc = map.get(code) ?? { name: catNameMap[code] ?? code, gross: 0, units: 0 };
      acc.gross += s.grossAmount;
      acc.units += s.quantity;
      map.set(code, acc);
    }
  }
  return map;
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

function fmtWon(n: number) {
  if (n >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(1)}억원`;
  if (n >= 1_0000) return `${(n / 1_0000).toFixed(0)}만원`;
  return `${fmt(n)}원`;
}

const currentFrom = "2026-06-01";
const currentTo   = "2026-06-08";
const prevFrom    = "2026-05-25";
const prevTo      = "2026-05-31";

console.log(`\n📊 월누적 매출 요약 (${currentFrom} ~ ${currentTo})\n`);

const current = loadPeriod(currentFrom, currentTo);
const prev    = loadPeriod(prevFrom, prevTo);

const rows = [...current.entries()].map(([code, { name, gross, units }]) => {
  const prevGross = prev.get(code)?.gross ?? 0;
  const change = prevGross === 0 ? null : (gross - prevGross) / prevGross;
  return { code, name, gross, units, change };
}).sort((a, b) => b.gross - a.gross);

const totalGross = rows.reduce((s, r) => s + r.gross, 0);
const totalUnits = rows.reduce((s, r) => s + r.units, 0);

// Header
const W1 = 22, W2 = 16, W3 = 8, W4 = 14;
const line = "-".repeat(W1 + W2 + W3 + W4 + 3);
console.log(`${"카테고리".padEnd(W1)}${"매출(원)".padStart(W2)}${"건수".padStart(W3)}${"전주 대비".padStart(W4)}`);
console.log(line);

for (const r of rows) {
  const changeStr = r.change === null
    ? "      신규"
    : r.change >= 0
      ? `   +${(r.change * 100).toFixed(1)}%`
      : `   ${(r.change * 100).toFixed(1)}%`;
  const flag = r.change !== null && Math.abs(r.change) >= 0.2 ? (r.change >= 0 ? " ▲" : " ▼") : "  ";
  console.log(
    `${r.name.padEnd(W1)}${fmt(r.gross).padStart(W2)}${fmt(r.units).padStart(W3)}${(changeStr + flag).padStart(W4)}`
  );
}

console.log(line);
console.log(`${"합계".padEnd(W1)}${fmt(totalGross).padStart(W2)}${fmt(totalUnits).padStart(W3)}`);
console.log(`\n총 매출: ${fmtWon(totalGross)}  |  총 주문: ${fmt(totalUnits)}건`);
console.log("\n* 전주 대비: 2026-05-25 ~ 05-31 (7일) vs 2026-06-01 ~ 06-08 (8일)");
console.log("* ▲/▼ = 전주 대비 ±20% 이상 변동");
