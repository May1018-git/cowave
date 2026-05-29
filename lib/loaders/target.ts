import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import type { SiteId } from "../types";

/**
 * 월별 목표(타겟) 로더.
 *
 * `<DATA_DIR>/에누리/` 안의 "...타겟...xls" 파일을 읽어
 * 사이트 → 카테고리명 → [1월..12월] 목표액(원) 으로 변환한다.
 *
 * 파일 구조(섹션 단위):
 *   [null, "26년 에누리 Target", "1월", "2월", ... "12월"]
 *   [null, "라면/즉석밥/통조림", 801135057, 333182833, ...]
 *   ...
 *   [null, "26년 다나와 Target", "1월", ...]
 *
 * 카테고리명은 lib/category-map.ts 의 중분류 이름과 동일하게 맞춰져 있다.
 */
export interface TargetTable {
  enuri: Record<string, number[]>;
  danawa: Record<string, number[]>;
}

const SITE_FOLDERS = ["에누리"];

function readRows(buffer: Buffer): unknown[][] {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer" });
  } catch {
    wb = XLSX.read(buffer.toString("utf8"), { type: "string" });
  }
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });
}

function siteFromLabel(label: string): SiteId | null {
  if (label.includes("에누리")) return "enuri";
  if (label.includes("다나와")) return "danawa";
  return null;
}

function parseTargetRows(rows: unknown[][]): TargetTable {
  const table: TargetTable = { enuri: {}, danawa: {} };
  let site: SiteId | null = null;

  for (const row of rows) {
    if (!row || row.length === 0) continue;
    const label = row[1];
    if (typeof label !== "string" || label.trim() === "") continue;
    const name = label.trim();

    // 섹션 헤더 ("26년 에누리 Target" 등) → 이후 행의 소속 사이트 지정
    const headerSite = siteFromLabel(name);
    if (headerSite && /target/i.test(name)) {
      site = headerSite;
      continue;
    }
    if (!site) continue;
    if (name.endsWith("합계")) continue; // 합계 행은 카테고리 매핑 대상 아님

    const months: number[] = [];
    for (let m = 0; m < 12; m++) {
      const v = row[m + 2];
      months.push(typeof v === "number" ? v : Number(v) || 0);
    }
    if (months.every((v) => v === 0)) continue;
    table[site][name] = months;
  }
  return table;
}

export function loadTargets(dataDir: string): TargetTable {
  const empty: TargetTable = { enuri: {}, danawa: {} };
  if (!existsSync(dataDir)) return empty;

  for (const folder of SITE_FOLDERS) {
    const dir = join(dataDir, folder);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    const entries = readdirSync(dir);
    const targetFile = entries.find(
      (e) => /\.xlsx?$/i.test(e) && /(타겟|target|목표)/i.test(e),
    );
    if (!targetFile) continue;
    try {
      const buf = readFileSync(join(dir, targetFile));
      return parseTargetRows(readRows(buf));
    } catch {
      return empty;
    }
  }
  return empty;
}

let _cached: TargetTable | null = null;
let _cachedFor: string | null = null;

export function loadTargetsCached(dataDir: string): TargetTable {
  if (_cachedFor === dataDir && _cached) return _cached;
  _cached = loadTargets(dataDir);
  _cachedFor = dataDir;
  return _cached;
}
