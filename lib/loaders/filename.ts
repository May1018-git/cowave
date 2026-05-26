/**
 * 파일명 패턴 파서.
 * 예: "라면,즉석밥,통조림(1511)GMV_RAWDATA_2025-05-01_2025-05-31.xlsx"
 */
export interface ParsedFileName {
  categoriesLabel: string;
  categoryCode: string;
  from: string;
  to: string;
}

const PATTERN =
  /^(.+?)\((\d+)\)GMV_RAWDATA_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})\.xlsx$/i;

export function parseFileName(name: string): ParsedFileName | null {
  const match = PATTERN.exec(name);
  if (!match) return null;
  const [, categoriesLabel, categoryCode, from, to] = match;
  return { categoriesLabel, categoryCode, from, to };
}
