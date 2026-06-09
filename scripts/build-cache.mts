/**
 * 빌드 시 1회 실행: GMV 엑셀을 파싱해 JSON 캐시(data/.cache/parsed.json)로 저장.
 * 런타임(특히 Vercel 콜드 스타트)은 무거운 엑셀 대신 이 JSON 만 읽어 빠르게 뜬다.
 *
 * 증분 빌드:
 *   - 직전 빌드의 캐시(manifest 포함)를 읽고, 변경 없는 파일은 그 sales 슬라이스를
 *     그대로 재사용. 새로 추가/변경된 파일만 다시 파싱한다.
 *   - 파일 169개 중 1개만 새로 올라온 경우, 168개 cache hit + 1개 파싱 ≈ 수초.
 *
 * Vercel 빌드 캐시 보존:
 *   - Vercel 은 빌드 사이에 `.next/cache/` 디렉토리를 자동 보존한다.
 *     `data/.cache/parsed.json` 자체는 보존되지 않으므로,
 *     `.next/cache/data-incremental/parsed.json` 에도 사본을 두어 다음 빌드에서
 *     증분 베이스로 활용한다.
 *
 * DATA_DIR 이 없거나 GMV 파일이 없으면 조용히 건너뛴다(데모/CI 안전).
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import {
  cacheManifest,
  readCache,
  writeCache,
  type FileMeta,
} from "../lib/loaders/cache";
import { loadXlsxFile } from "../lib/loaders/xlsx";
import type { Product, Sale, SiteId } from "../lib/types";

const dataDir = process.env.DATA_DIR?.trim() || "./data";
const SITE_BY_FOLDER: Record<string, SiteId> = { 에누리: "enuri" };
const RUNTIME_CACHE = join(dataDir, ".cache", "parsed.json");
const BUILD_CACHE = ".next/cache/data-incremental/parsed.json";

// 1) 직전 빌드의 캐시 복원 (Vercel build cache → 런타임 위치)
//    `data/.cache/parsed.json` 이 비어있고, `.next/cache/data-incremental/parsed.json`
//    이 살아있으면 그걸 가져와 증분 베이스로 사용한다.
if (!existsSync(RUNTIME_CACHE) && existsSync(BUILD_CACHE)) {
  mkdirSync(dirname(RUNTIME_CACHE), { recursive: true });
  copyFileSync(BUILD_CACHE, RUNTIME_CACHE);
  console.log(`[cache] Vercel 빌드 캐시에서 직전 캐시 복원 (${BUILD_CACHE} → ${RUNTIME_CACHE})`);
}

const newManifest = cacheManifest(dataDir);

if (newManifest.length === 0) {
  console.log(`[cache] GMV 파일 없음 (DATA_DIR=${dataDir}) — 캐시 생략`);
  process.exit(0);
}

const prevCache = readCache(dataDir);
const prevByName = new Map<string, FileMeta>(
  prevCache?.manifest.map((m) => [m.name, m]) ?? [],
);

const sales: Sale[] = [];
const productMap = new Map<string, Product>();
const builtManifest: FileMeta[] = [];
let hits = 0;
let misses = 0;

const start = Date.now();
for (const m of newManifest) {
  const prev = prevByName.get(m.name);
  const reusable =
    prev !== undefined &&
    prev.size === m.size &&
    prev.saleStart !== undefined &&
    prev.saleEnd !== undefined &&
    prevCache !== null;

  if (reusable) {
    // cache hit — 직전 캐시의 sales 슬라이스를 그대로 재사용
    const slice = prevCache!.sales.slice(prev!.saleStart, prev!.saleEnd);
    const saleStart = sales.length;
    sales.push(...slice);
    builtManifest.push({
      name: m.name,
      size: m.size,
      saleStart,
      saleEnd: sales.length,
    });
    hits += 1;
  } else {
    // cache miss — 파일 파싱
    const [folder, fileName] = splitName(m.name);
    const siteId = SITE_BY_FOLDER[folder];
    if (!siteId) {
      console.warn(`[cache] 알 수 없는 폴더 — 건너뜀: ${m.name}`);
      continue;
    }
    const buf = readFileSync(join(dataDir, folder, fileName));
    const result = loadXlsxFile(buf, fileName, siteId);
    const saleStart = sales.length;
    sales.push(...result.sales);
    for (const [pid, p] of result.products) {
      if (!productMap.has(pid)) productMap.set(pid, { ...p, basePrice: 0 });
    }
    builtManifest.push({
      name: m.name,
      size: m.size,
      saleStart,
      saleEnd: sales.length,
    });
    misses += 1;
  }
}

// 캐시 hit 된 파일들의 products 도 보존해야 함 (그 파일들은 다시 파싱하지 않으므로).
// dedupe by id — 이미 있는 id 는 기존 거 유지(first-wins).
if (prevCache) {
  for (const p of prevCache.products) {
    if (!productMap.has(p.id)) productMap.set(p.id, p);
  }
}

const parseMs = Date.now() - start;
const ok = writeCache(
  dataDir,
  {
    sales,
    products: [...productMap.values()],
    warnings: [],
    filesLoaded: builtManifest.length,
  },
  builtManifest,
);

console.log(
  `[cache] ${ok ? "작성 완료" : "작성 실패"} · 파일 ${newManifest.length}개 (cache hit ${hits} · miss ${misses}) · sales=${sales.length.toLocaleString()} · products=${productMap.size.toLocaleString()} · ${parseMs}ms`,
);

// 2) 결과를 Vercel 빌드 캐시 위치에도 사본 저장 (다음 빌드의 증분 베이스용)
if (ok) {
  try {
    mkdirSync(dirname(BUILD_CACHE), { recursive: true });
    copyFileSync(RUNTIME_CACHE, BUILD_CACHE);
    console.log(`[cache] Vercel 빌드 캐시에도 사본 저장 (${BUILD_CACHE})`);
  } catch (e) {
    console.warn(`[cache] 빌드 캐시 사본 저장 실패 (무시): ${(e as Error).message}`);
  }
}

if (!ok) process.exit(1);

function splitName(name: string): [string, string] {
  const i = name.indexOf("/");
  return [name.slice(0, i), name.slice(i + 1)];
}
