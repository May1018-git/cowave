import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { UploadForm } from "./UploadForm";

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
  return <UploadForm cacheSizeMB={cacheSizeMB} />;
}
