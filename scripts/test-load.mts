import { readFileSync } from "node:fs";
import { loadXlsxFile, loadXlsxRaw } from "../lib/loaders/xlsx";

const file =
  "/root/.claude/uploads/abd72d3d-c702-42cb-94f9-fd7b275a0685/f5108c4f-________1511GMV_RAWDATA_20260201_20260228.xls";
const buf = readFileSync(file);
const nameForParser = "라면즉석밥통조림1511GMV_RAWDATA_20260201_20260228.xls";

const { rows: raw, warnings: rawW } = loadXlsxRaw(buf, nameForParser, "enuri");
console.log("RAW rows:", raw.length, "warnings:", rawW);
console.log("First 3 raw:", JSON.stringify(raw.slice(0, 3), null, 2));

const { sales, warnings } = loadXlsxFile(buf, nameForParser, "enuri");
console.log("\nSales:", sales.length, "warnings:", warnings);
console.log("First 3 sales:", JSON.stringify(sales.slice(0, 3), null, 2));

const byMall = new Map<string, number>();
for (const s of sales)
  byMall.set(s.mallId, (byMall.get(s.mallId) ?? 0) + s.grossAmount);
console.log("\nGross by mall (top 8):");
console.log(
  [...byMall.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
);

const byCat = new Map<string, number>();
for (const r of raw)
  byCat.set(r.categoryCode, (byCat.get(r.categoryCode) ?? 0) + r.grossAmount);
console.log("\nGross by category code (top 8):");
console.log(
  [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
);
