/**
 * 파일명 패턴 파서.
 *
 * 지원 형식:
 *   - "라면즉석밥통조림(1511)GMV_RAWDATA_2025-05-01_2025-05-31.xlsx"
 *   - "라면즉석밥통조림1511GMV_RAWDATA_20260201_20260228.xls"
 *
 * 즉, 카테고리 코드는 괄호 유무 둘 다 허용, 날짜는 대시 유무 둘 다 허용,
 * 확장자는 .xls / .xlsx 둘 다 허용.
 */
export interface ParsedFileName {
  categoriesLabel: string;
  categoryCode: string;
  from: string;
  to: string;
}

const PATTERN =
  /^(.+?)\(?(\d+)\)?GMV_RAWDATA_(\d{4})-?(\d{2})-?(\d{2})_(\d{4})-?(\d{2})-?(\d{2})\.xlsx?$/i;

export function parseFileName(name: string): ParsedFileName | null {
  const match = PATTERN.exec(name);
  if (!match) return null;
  const [, categoriesLabel, categoryCode, fy, fm, fd, ty, tm, td] = match;
  return {
    categoriesLabel: categoriesLabel.trim(),
    categoryCode,
    from: `${fy}-${fm}-${fd}`,
    to: `${ty}-${tm}-${td}`,
  };
}
