import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { Product, Sale } from "../types";
import type { FileSystemLoadResult } from "./file-system";

/**
 * 파싱 결과 디스크 캐시.
 *
 * 엑셀(.xls HTML 테이블) 파싱은 296k행 기준 약 45초가 걸려, Vercel 콜드
 * 스타트마다 첫 요청이 매우 느리거나 타임아웃났다. 빌드 시 한 번 파싱해
 * JSON 으로 저장해두면 런타임은 JSON 만 읽어 1~2초로 끝난다.
 *
 * 무효화: GMV 원천 파일들의 (이름·크기·mtime) 매니페스트를 캐시에 함께
 * 저장하고, 로드 시 현재 파일들과 비교해 다르면 캐시를 무시하고 재파싱한다.
 * 따라서 파일을 추가/교체하면 자동으로 캐시가 갱신된다.
 */
const CACHE_VERSION = 1;
const SITE_FOLDERS = ["에누리"];

export interface FileMeta {
  name: string;
  size: number;
}

interface CacheFile {
  version: number;
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

export function readCache(dataDir: string): CacheFile | null {
  const p = cachePath(dataDir);
  if (!existsSync(p)) return null;
  try {
    const obj = JSON.parse(readFileSync(p, "utf8")) as CacheFile;
    if (
      obj.version !== CACHE_VERSION ||
      !Array.isArray(obj.sales) ||
      !Array.isArray(obj.products) ||
      !Array.isArray(obj.manifest)
    ) {
      return null;
    }
    return obj;
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
    mkdirSync(dirname(p), { recursive: true });
    const payload: CacheFile = {
      version: CACHE_VERSION,
      manifest,
      sales: result.sales,
      products: result.products,
    };
    writeFileSync(p, JSON.stringify(payload));
    return true;
  } catch {
    // 런타임 읽기 전용 FS(Vercel) 등에서는 쓰기 실패해도 무시.
    return false;
  }
}
