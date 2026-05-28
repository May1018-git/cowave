import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Product, Sale, SiteId } from "../types";
import { loadXlsxFile } from "./xlsx";

const SITE_FOLDERS: Array<{ id: SiteId; folder: string }> = [
  { id: "enuri", folder: "에누리" },
];

export interface FileSystemLoadResult {
  sales: Sale[];
  products: Product[];
  warnings: string[];
  filesLoaded: number;
}

export function loadDataDir(dataDir: string): FileSystemLoadResult {
  const sales: Sale[] = [];
  const productMap = new Map<string, Product>();
  const warnings: string[] = [];
  let filesLoaded = 0;

  if (!existsSync(dataDir)) {
    return {
      sales,
      products: [],
      warnings: [`DATA_DIR not found: ${dataDir}`],
      filesLoaded,
    };
  }

  for (const { id, folder } of SITE_FOLDERS) {
    const dir = join(dataDir, folder);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;

    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (!/\.xlsx?$/i.test(entry)) continue;
      // GMV 원천 파일만 매출로 적재. 목표(타겟) 등 보조 파일은 건너뜀.
      if (!/GMV_RAWDATA/i.test(entry)) continue;
      const fullPath = join(dir, entry);
      try {
        const buf = readFileSync(fullPath);
        const result = loadXlsxFile(buf, entry, id);
        sales.push(...result.sales);
        warnings.push(...result.warnings);
        for (const [pid, p] of result.products) {
          if (!productMap.has(pid)) {
            productMap.set(pid, { ...p, basePrice: 0 });
          }
        }
        filesLoaded += 1;
      } catch (err) {
        warnings.push(`Failed to load ${fullPath}: ${(err as Error).message}`);
      }
    }
  }

  return {
    sales,
    products: [...productMap.values()],
    warnings,
    filesLoaded,
  };
}

let _cached: FileSystemLoadResult | null = null;
let _cachedFor: string | null = null;

export function loadDataDirCached(dataDir: string): FileSystemLoadResult {
  if (_cachedFor === dataDir && _cached) return _cached;
  _cached = loadDataDir(dataDir);
  _cachedFor = dataDir;
  return _cached;
}

export function invalidateDataDirCache() {
  _cached = null;
  _cachedFor = null;
}
