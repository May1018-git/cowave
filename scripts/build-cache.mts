/**
 * 빌드 시 1회 실행: GMV 엑셀을 파싱해 JSON 캐시(data/.cache/parsed.json)로 저장.
 * 런타임(특히 Vercel 콜드 스타트)은 무거운 엑셀 대신 이 JSON 만 읽어 빠르게 뜬다.
 *
 * DATA_DIR 이 없거나 GMV 파일이 없으면 조용히 건너뛴다(데모/CI 안전).
 */
import { cacheManifest, writeCache } from "../lib/loaders/cache";
import { loadDataDir } from "../lib/loaders/file-system";

const dataDir = process.env.DATA_DIR?.trim() || "./data";
const manifest = cacheManifest(dataDir);

if (manifest.length === 0) {
  console.log(`[cache] GMV 파일 없음 (DATA_DIR=${dataDir}) — 캐시 생략`);
  process.exit(0);
}

console.log(`[cache] ${manifest.length}개 파일 파싱 시작 (DATA_DIR=${dataDir})`);
const start = Date.now();
const result = loadDataDir(dataDir);
const parseMs = Date.now() - start;
const ok = writeCache(dataDir, result, manifest);

console.log(
  `[cache] ${ok ? "작성 완료" : "작성 실패"} · sales=${result.sales.length.toLocaleString()} · products=${result.products.length.toLocaleString()} · ${parseMs}ms`,
);
if (!ok) process.exit(1);
