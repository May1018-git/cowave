/**
 * 업로드 파일명 검증. 클라이언트(/upload 페이지)와 서버(/api/upload-commit)
 * 양쪽에서 동일 규칙을 적용해 잘못된 파일이 GitHub 까지 도달하지 못하게 한다.
 *
 * 사건 배경:
 *   - 2026-06: 카테고리 prefix 가 없는 raw export(모든 카테고리가 섞인 파일)가
 *     업로드돼 모든 카테고리 토글에서 매출이 중복 집계된 사고가 발생.
 *
 * 카테고리 코드 면제 조건:
 *   - 일자별 파일(수집 기간 7일 이내)은 카테고리 prefix 없어도 통과.
 *     모든 카테고리가 섞여 있어도 행 단위 categoryCode 로 정확히 분리됨.
 *   - 2026-08: 평일/주말 구분 없이 한 주치를 한 번에 올릴 수 있도록
 *     3일 → 7일로 연장.
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

/**
 * 카테고리 prefix 없이 허용되는 최대 수집 일수(시작·종료일 포함).
 * 평일/주말 구분 없이 한 주치까지 한 파일로 올릴 수 있게 7일로 둔다.
 */
const MAX_SPAN_DAYS = 7;

/**
 * 일자별 파일 패턴 — 파일이 담는 기간이 MAX_SPAN_DAYS 이내.
 *
 * 이 면제는 길이와 무관하게 안전하다. 모든 카테고리가 섞여 있어도 행 단위
 * categoryCode 로 분리되기 때문이다. 길이를 제한하는 건 에누리 export 의
 * 20,000행 한도 때문으로, 기간이 길수록 조용히 잘릴 위험이 커진다.
 * (잘림 자체는 checkFileSizeWarning 이 파일 크기로 따로 경고한다.)
 */
function isShortRangeFilename(name: string): boolean {
  const m = name.match(
    /GMV_RAWDATA_(\d{4})-(\d{2})-(\d{2})_(\d{4})-(\d{2})-(\d{2})\.xlsx?$/i,
  );
  if (!m) return false;
  const start = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const end = Date.UTC(+m[4], +m[5] - 1, +m[6]);
  const spanDays = (end - start) / 86_400_000 + 1; // 양 끝 포함
  return spanDays >= 1 && spanDays <= MAX_SPAN_DAYS;
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
  // 카테고리 코드(네 자리) 필수 — 단, 일자별 파일(7일 이내)이면 면제.
  // 모든 카테고리가 섞여 있어도 행 단위 categoryCode 로 자동 분리되므로 안전.
  if (!/\(\d{4}\)/.test(name) && !isShortRangeFilename(name)) {
    return {
      code: "no-category-code",
      message: `파일명에 카테고리 코드(예: (1501))가 없습니다. 카테고리 prefix 없는 파일은 수집 기간이 ${MAX_SPAN_DAYS}일 이내일 때만 허용됩니다.`,
    };
  }
  return null;
}
