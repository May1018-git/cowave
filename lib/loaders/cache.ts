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
 * 캐시로 저장해두면 런타임은 그것만 읽는다.
 *
 * 저장 포맷(v6)은 파일 두 개로 나뉜다.
 *
 *   parsed.bin       매출 200만 행을 컬럼별 타입드 배열로 이어붙인 이진 블록.
 *                    readFileSync 는 단순 복사고, 각 컬럼은 복사 없이 뷰만
 *                    씌워 읽는다. 파싱 비용이 사실상 0 이다.
 *   parsed.meta.json 사전(날짜·사이트·쇼핑몰·카테고리) + 상품 + 매니페스트.
 *                    문자열이라 JSON 으로 두되, 매출 행에 비해 훨씬 작다.
 *
 * v5(단일 JSON) 대비 콜드 스타트가 약 13.5초 → 2.2초로 줄었다. 70MB 짜리
 * JSON 을 UTF-8 문자열로 읽고(5.7초) 파싱하는(3.3초) 단계가 통째로 없어진
 * 덕분이다.
 *
 * 컬럼은 원소 크기가 큰 것부터 배치한다. 타입드 배열 뷰는 시작 오프셋이
 * 원소 크기의 배수여야 해서, 8→4→2→1 순으로 두면 행 수와 무관하게 정렬이 맞는다.
 *
 * 저장하지 않는 것 (모두 무손실 — 화면 출력에 영향 없음):
 *  - Sale.id — 어디서도 읽지 않는다. 행마다 문자열을 만들면 로드가 0.7초 늘어난다.
 *  - Sale.commission — 실제 수수료율 데이터가 없어 임시 상수로 계산되던 값이고
 *    어느 화면에도 표시되지 않는다.
 *  - Product.basePrice — 실데이터 경로에서 항상 0 (목업 전용 필드)
 *  - Product.modelNumber — id 가 `M-{모델번호}` 라 그대로 유도된다.
 *
 * 증분 빌드: manifest 각 항목에 saleStart/saleEnd 를 두어 파일별 sales 범위를
 * 추적한다. 다음 빌드에서 변경 없는 파일은 그 슬라이스를 그대로 재사용한다.
 *
 * 무효화: GMV 원천 파일들의 (이름·크기) 매니페스트를 캐시에 함께 저장하고,
 * 로드 시 현재 파일들과 비교해 다르면 캐시를 무시하고 재파싱한다.
 * (런타임 번들에는 원본 .xls 가 없어 매니페스트가 비는데, 이때는 캐시를
 * 그대로 신뢰한다 — 배포 시점에 올바른 데이터로 만들어졌기 때문)
 */
const CACHE_VERSION = 6;
const SITE_FOLDERS = ["에누리"];

export interface FileMeta {
  name: string;
  size: number;
  /** 캐시 내 sales 배열에서 이 파일이 차지하는 [시작, 끝) 인덱스. 증분 빌드용. */
  saleStart?: number;
  saleEnd?: number;
}

/** [id, name, categoryCode, manufacturer, productCode] */
type ProductTuple = [string, string, string, string, string];

interface CacheMetaV6 {
  version: number;
  manifest: FileMeta[];
  products: ProductTuple[];
  dates: string[];
  sites: SiteId[];
  malls: string[];
  cats: string[];
  /** 매출 행 수. parsed.bin 크기 검증에 쓴다. */
  n: number;
}

export interface DecodedCache {
  manifest: FileMeta[];
  sales: Sale[];
  products: Product[];
}

/** 한 행이 차지하는 바이트 수 — gross8 + qty4 + prod4 + date2 + cat2 + mall2 + site1 */
const BYTES_PER_ROW = 8 + 4 + 4 + 2 + 2 + 2 + 1;

/** id 가 `M-{모델번호}` 면 모델번호를, `C-{상품코드}` 면 빈 문자열을 준다. */
function modelNumberFromId(id: string): string {
  return id.startsWith("M-") ? id.slice(2) : "";
}

function metaPath(dataDir: string): string {
  return join(dataDir, ".cache", "parsed.meta.json");
}

function binPath(dataDir: string): string {
  return join(dataDir, ".cache", "parsed.bin");
}

/** 캐시를 이루는 파일 경로들. 빌드 스크립트가 통째로 복사할 때 쓴다. */
export function cacheFiles(dataDir: string): string[] {
  return [metaPath(dataDir), binPath(dataDir)];
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

export function manifestEqual(a: FileMeta[], b: FileMeta[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].name !== b[i].name || a[i].size !== b[i].size) return false;
  }
  return true;
}

export function readCache(dataDir: string): DecodedCache | null {
  const mp = metaPath(dataDir);
  const bp = binPath(dataDir);
  if (!existsSync(mp) || !existsSync(bp)) return null;
  try {
    const meta = JSON.parse(readFileSync(mp, "utf8")) as CacheMetaV6;
    if (
      meta.version !== CACHE_VERSION ||
      !Array.isArray(meta.products) ||
      !Array.isArray(meta.dates) ||
      !Array.isArray(meta.sites) ||
      !Array.isArray(meta.malls) ||
      !Array.isArray(meta.manifest) ||
      typeof meta.n !== "number"
    ) {
      return null;
    }

    const buf = readFileSync(bp);
    const n = meta.n;
    // 두 파일이 짝이 맞는지 확인. 한쪽만 갱신된 캐시를 읽으면 조용히 망가진다.
    if (buf.byteLength !== n * BYTES_PER_ROW) return null;

    let o = buf.byteOffset;
    const gross = new Float64Array(buf.buffer, o, n); o += n * 8;
    const qty = new Int32Array(buf.buffer, o, n); o += n * 4;
    const prodI = new Int32Array(buf.buffer, o, n); o += n * 4;
    const dateI = new Uint16Array(buf.buffer, o, n); o += n * 2;
    const catI = new Uint16Array(buf.buffer, o, n); o += n * 2;
    const mallI = new Uint16Array(buf.buffer, o, n); o += n * 2;
    const siteI = new Uint8Array(buf.buffer, o, n);

    const { dates, sites, malls, cats } = meta;
    const products: Product[] = meta.products.map((t) => ({
      id: t[0],
      name: t[1],
      categoryCode: t[2],
      manufacturer: t[3],
      productCode: t[4],
      modelNumber: modelNumberFromId(t[0]),
      basePrice: 0,
    }));

    const sales: Sale[] = new Array(n);
    for (let i = 0; i < n; i += 1) {
      sales[i] = {
        date: dates[dateI[i]],
        siteId: sites[siteI[i]],
        productId: products[prodI[i]].id,
        mallId: malls[mallI[i]],
        quantity: qty[i],
        grossAmount: gross[i],
        commission: 0,
        categoryCode: cats[catI[i]] ?? "",
      };
    }
    return { manifest: meta.manifest, sales, products };
  } catch {
    return null;
  }
}

export function writeCache(
  dataDir: string,
  result: FileSystemLoadResult,
  manifest: FileMeta[],
): boolean {
  try {
    const dates: string[] = [];
    const dateIdx = new Map<string, number>();
    const sites: SiteId[] = [];
    const siteIdx = new Map<SiteId, number>();
    const malls: string[] = [];
    const mallIdx = new Map<string, number>();
    const cats: string[] = [];
    const catIdx = new Map<string, number>();
    const prodIdx = new Map<string, number>();
    result.products.forEach((prod, i) => prodIdx.set(prod.id, i));

    const n = result.sales.length;
    const gross = new Float64Array(n);
    const qty = new Int32Array(n);
    const prodI = new Int32Array(n);
    const dateI = new Uint16Array(n);
    const catI = new Uint16Array(n);
    const mallI = new Uint16Array(n);
    const siteI = new Uint8Array(n);

    for (let i = 0; i < n; i += 1) {
      const s = result.sales[i];
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
      let mi = mallIdx.get(s.mallId);
      if (mi === undefined) {
        mi = malls.length;
        malls.push(s.mallId);
        mallIdx.set(s.mallId, mi);
      }
      let ci = catIdx.get(s.categoryCode);
      if (ci === undefined) {
        ci = cats.length;
        cats.push(s.categoryCode);
        catIdx.set(s.categoryCode, ci);
      }
      dateI[i] = di;
      siteI[i] = si;
      mallI[i] = mi;
      catI[i] = ci;
      prodI[i] = prodIdx.get(s.productId) ?? -1;
      qty[i] = s.quantity;
      gross[i] = s.grossAmount;
    }

    // 사전이 컬럼 폭을 넘으면 인덱스가 조용히 잘려 엉뚱한 값으로 디코딩된다.
    // 데이터가 쌓여 한계에 닿으면 여기서 즉시 실패시켜 알아차리게 한다.
    if (dates.length > 0xffff) throw new Error(`날짜 종류 ${dates.length} > 65535`);
    if (cats.length > 0xffff) throw new Error(`카테고리 종류 ${cats.length} > 65535`);
    if (malls.length > 0xffff) throw new Error(`쇼핑몰 종류 ${malls.length} > 65535`);
    if (sites.length > 0xff) throw new Error(`사이트 종류 ${sites.length} > 255`);

    const products: ProductTuple[] = result.products.map((prod) => [
      prod.id,
      prod.name,
      prod.categoryCode,
      prod.manufacturer ?? "",
      prod.productCode ?? "",
    ]);

    const meta: CacheMetaV6 = {
      version: CACHE_VERSION,
      manifest,
      products,
      dates,
      sites,
      malls,
      cats,
      n,
    };

    mkdirSync(dirname(metaPath(dataDir)), { recursive: true });
    // 이진 블록을 먼저 쓴다. meta 가 마지막에 놓여야, 중간에 실패했을 때
    // 남은 meta 가 옛 것이라 readCache 의 크기 검증에서 걸러진다.
    writeFileSync(
      binPath(dataDir),
      Buffer.concat(
        [gross, qty, prodI, dateI, catI, mallI, siteI].map((a) =>
          Buffer.from(a.buffer, a.byteOffset, a.byteLength),
        ),
      ),
    );
    writeFileSync(metaPath(dataDir), JSON.stringify(meta));
    return true;
  } catch {
    // 런타임 읽기 전용 FS(Vercel) 등에서는 쓰기 실패해도 무시.
    return false;
  }
}
