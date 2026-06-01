import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { CATEGORIES } from "@/lib/category-map";
import { UploadForm } from "./UploadForm";

/**
 * JSON 캐시 파일 크기(MB) 를 읽는다. Vercel 서버리스 함수 한도(250MB) 에
 * 근접하기 전 미리 경고하려는 용도. 캐시가 없거나 stat 실패 시 null.
 */
function getCacheSizeMB(): number | null {
  const dataDir = process.env.DATA_DIR?.trim() || "./data";
  const cachePath = join(process.cwd(), dataDir, ".cache", "parsed.json");
  try {
    if (!existsSync(cachePath)) return null;
    return statSync(cachePath).size / 1024 / 1024;
  } catch {
    return null;
  }
}

export default function UploadPage() {
  const cacheSizeMB = getCacheSizeMB();
  const midCategories = CATEGORIES.filter((c) => c.depth === 2).map((c) => ({
    code: c.code,
    name: c.name,
  }));
  return <UploadForm cacheSizeMB={cacheSizeMB} midCategories={midCategories} />;
}
