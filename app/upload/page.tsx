import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { UploadForm } from "./UploadForm";

function getCacheSizeMB(): number | null {
  const dataDir = process.env.DATA_DIR?.trim() || "./data";
  const dir = join(process.cwd(), dataDir, ".cache");
  // 캐시는 메타(JSON) + 매출 본문(이진) 두 파일로 나뉜다. 번들 용량은 둘의 합.
  const paths = ["parsed.meta.json", "parsed.bin"].map((f) => join(dir, f));
  try {
    if (paths.some((p) => !existsSync(p))) return null;
    return paths.reduce((sum, p) => sum + statSync(p).size, 0) / 1024 / 1024;
  } catch {
    return null;
  }
}

export default function UploadPage() {
  const cacheSizeMB = getCacheSizeMB();
  return <UploadForm cacheSizeMB={cacheSizeMB} />;
}
