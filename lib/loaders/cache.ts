import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { Product, Sale, SiteId } from "../types";
import type { FileSystemLoadResult } from "./file-system";

/**
 * 파싱 결과 디스크 캐시.
 *
 * 엑셀(.xls HTML 테이블) 파싱은 수십만 행 기준 수십 초가 걸려, Vercel 콜드
 * 스타트마다 첫 요청이 매우 느리거나 타임아웃났다. 빌드 시 한 번 파싱해
 * JSON 으로 저장해두면 런타임은 JSON 만 읽어 빠르게 끝난다.
 *
 * 저장 포맷(v2)은 용량 최적화를 위해 컬럼/인덱스 압축을 쓴다.
 *  - sales 를 객체 배열이 아닌 튜플 배열로 (반복 키 제거)
 *  - 날짜는 distinct 사전 + 인덱스, productId 는 products 인덱스로 치환
 *  - Sale.id 는 저장하지 않고 로드 시 재생성 (집계에 안 쓰임)
 * 덕분에 서버리스 함수 250MB 한도 안에 넉넉히 들어간다.
 *
 * 무효화: GMV 원천 파일들의 (이름·크기) 매니페스트를 캐시에 함께 저장하고,
 * 로드 시 현재 파일들과 비교해 다르면 캐시를 무시하고 재파싱한다.
 * (런타임 번들에는 원본 .xls 가 없어 매니페스트가 비는데, 이때는 캐시를
 * 그대로 신뢰한다 — 배포 시점에 올바른 데이터로 만들어졌기 때문)
 */
const CACHE_VERSION = 3;
const SITE_FOLDERS = ["에누리"];

export interface FileMeta {
  name: string;
  size: number;
}

interface CacheFileV2 {
  version: number;
  manifest: FileMeta[];
  products: Product[];
  dates: string[];
  sites: SiteId[];
  // [dateIdx, siteIdx, productIdx, mallId, quantity, grossAmount, commission]
  sales: [number, number, number, string, number, number, number][];
}

interface CacheFileV3 {
  version: number;
  manifest: FileMeta[];
  products: Product[];
  dates: string[];
  sites: SiteId[];
  cats: string[];
  // [dateIdx, siteIdx, productIdx, mallId, quantity, grossAmount, commission, catIdx]
  sales: [number, number, number, string, number, number, number, number][];
}

export interface DecodedCache {
  manifest: FileMeta[];
  sales: Sale[];
  products: Product[];
}

export function cacheManifest(dataDir: string): FileMeta[] {
  const metas: FileMeta[] = [];
  for (const folder of SITE_FOLDERS) {
    const dir = join(dataDir, folder);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    for (const entry of readdirSync(dir)) {
      if (!/\.xlsx?$/i.test(entry)) continue;
      if (!/GMV_RAWDATA/i.test(entry)) continue;
      const st = statSync(join(dir, entry));
      // 이름+크기만 사용. mtime 은 Vercel 번들 복사 과정에서 바뀌어
      // 갓 만든 캐시를 런타임이 불신하게 만들 수 있어 제외한다.
      metas.push({ name: `${folder}/${entry}`, size: st.size });
    }
  }
  return metas.sort((a, b) => a.name.localeCompare(b.name));
}

function cachePath(dataDir: string): string {
  return join(dataDir, ".cache", "parsed.json");
}

export function manifestEqual(a: FileMeta[], b: FileMeta[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].name !== b[i].name || a[i].size !== b[i].size) return false;
  }
  return true;
}

export function readCache(dataDir: string): DecodedCache | null {
  const p = cachePath(dataDir);
  if (!existsSync(p)) return null;
  try {
    const obj = JSON.parse(readFileSync(p, "utf8")) as CacheFileV3;
    if (
      obj.version !== CACHE_VERSION ||
      !Array.isArray(obj.sales) ||
      !Array.isArray(obj.products) ||
      !Array.isArray(obj.dates) ||
      !Array.isArray(obj.sites) ||
      !Array.isArray(obj.manifest)
    ) {
      return null;
    }
    const { dates, sites, products, cats } = obj;
    const sales: Sale[] = obj.sales.map((r, i) => ({
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
    return { manifest: obj.manifest, sales, products };
  } catch {
    return null;
  }
}

export function writeCache(
  dataDir: string,
  result: FileSystemLoadResult,
  manifest: FileMeta[],
): boolean {
  const p = cachePath(dataDir);
  try {
    const dates: string[] = [];
    const dateIdx = new Map<string, number>();
    const sites: SiteId[] = [];
    const siteIdx = new Map<SiteId, number>();
    const cats: string[] = [];
    const catIdx = new Map<string, number>();
    const prodIdx = new Map<string, number>();
    result.products.forEach((prod, i) => prodIdx.set(prod.id, i));

    const sales = result.sales.map((s) => {
      let di = dateIdx.get(s.date);
      if (di === undefined) {
        di = dates.length;
        dates.push(s.date);
        dateIdx.set(s.date, di);
      }
      let si = siteIdx.get(s.siteId);
      if (si === undefined) {
        si = sites.length;
        sites.push(s.siteId);
        siteIdx.set(s.siteId, si);
      }
      let ci = catIdx.get(s.categoryCode);
      if (ci === undefined) {
        ci = cats.length;
        cats.push(s.categoryCode);
        catIdx.set(s.categoryCode, ci);
      }
      const pi = prodIdx.get(s.productId) ?? -1;
      return [di, si, pi, s.mallId, s.quantity, s.grossAmount, s.commission, ci] as [
        number,
        number,
        number,
        string,
        number,
        number,
        number,
        number,
      ];
    });

    mkdirSync(dirname(p), { recursive: true });
    const payload: CacheFileV3 = {
      version: CACHE_VERSION,
      manifest,
      products: result.products,
      dates,
      sites,
      cats,
      sales,
    };
    writeFileSync(p, JSON.stringify(payload));
    return true;
  } catch {
    // 런타임 읽기 전용 FS(Vercel) 등에서는 쓰기 실패해도 무시.
    return false;
  }
}
