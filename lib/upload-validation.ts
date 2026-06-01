/**
 * 업로드 파일명 검증. 클라이언트(/upload 페이지)와 서버(/api/upload-commit)
 * 양쪽에서 동일 규칙을 적용해 잘못된 파일이 GitHub 까지 도달하지 못하게 한다.
 *
 * 사건 배경:
 *   - 2026-06: 카테고리 prefix 가 없는 raw export(모든 카테고리가 섞인 파일)가
 *     업로드돼 모든 카테고리 토글에서 매출이 중복 집계된 사고가 발생.
 */
export interface ValidationError {
  code:
    | "bad-extension"
    | "office-temp"
    | "processed-file"
    | "no-gmv-marker"
    | "no-category-code"
    | "path-traversal";
  message: string;
}

/**
 * 에누리 GMV export 한도 추정 임계값. 12MB 안팎의 xls 파일은 20,000행 한도에
 * 도달했을 가능성이 매우 높음(현재 12MB ≒ 20K행). 잘리면 매출 누락 발생.
 */
const TRUNCATION_SIZE_BYTES = 11_500_000;

export interface SizeWarning {
  code: "possibly-truncated";
  message: string;
}

export function checkFileSizeWarning(size: number): SizeWarning | null {
  if (size >= TRUNCATION_SIZE_BYTES) {
    return {
      code: "possibly-truncated",
      message: `⚠ 파일이 ${(size / 1024 / 1024).toFixed(1)}MB — 에누리 export 20,000행 한도에 걸려 매출 일부가 잘렸을 수 있습니다. 더 짧은 기간(예: 10일 단위)으로 쪼개 받아 올리세요.`,
    };
  }
  return null;
}

export function validateUploadFilename(name: string): ValidationError | null {
  // 경로 탈출 방지
  if (name.includes("/") || name.includes("\\") || name.includes("..") || name.startsWith(".")) {
    return {
      code: "path-traversal",
      message: "파일명에 / \\ .. 포함하거나 . 로 시작할 수 없습니다.",
    };
  }
  // 확장자
  if (!/\.xlsx?$/i.test(name)) {
    return {
      code: "bad-extension",
      message: "xls 또는 xlsx 파일만 업로드 가능합니다.",
    };
  }
  // Office 가 만드는 lock 파일
  if (name.startsWith("~$")) {
    return {
      code: "office-temp",
      message: "Office 임시 파일(~$ 로 시작)은 업로드할 수 없습니다.",
    };
  }
  // 가공/복사본
  if (/(임시|복사본|요약|copy)/i.test(name)) {
    return {
      code: "processed-file",
      message: "임시/복사본/요약/copy 가 포함된 가공 파일로 보입니다. GMV 원본만 업로드하세요.",
    };
  }
  // GMV 원본 마커
  if (!/GMV_RAWDATA/i.test(name)) {
    return {
      code: "no-gmv-marker",
      message: "GMV 원본 파일이 아닙니다. 파일명에 'GMV_RAWDATA' 가 있어야 합니다.",
    };
  }
  // 카테고리 코드(네 자리) 필수
  if (!/\(\d{4}\)/.test(name)) {
    return {
      code: "no-category-code",
      message:
        "파일명에 카테고리 코드(예: (1501))가 없습니다. 카테고리 prefix 없이 전체 raw export 를 올리면 모든 카테고리 매출이 중복 집계됩니다.",
    };
  }
  return null;
}
