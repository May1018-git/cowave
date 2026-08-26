import * as XLSX from "xlsx";
import { MALLS } from "../mall-map";
import type { Sale, SiteId } from "../types";
import { parseFileName } from "./filename";

/**
 * Excel/HTML 파일 → Sale 정규화.
 *
 * 에누리 GMV Raw Data는 `.xls` 확장자지만 실제로는 EUC-KR HTML 테이블이다.
 * 이 모듈은 두 경우를 모두 처리한다:
 *   1) 진짜 XLSX 바이너리
 *   2) HTML 테이블 (EUC-KR 또는 UTF-8)
 */

export const ENURI_HEADERS = {
  date: "체결일",
  device: "디바이스",
  mall: "쇼핑몰",
  productCode: "상품코드",
  category: "카테고리",
  mallProductName: "쇼핑몰 상품명",
  enuriModel: "에누리 모델번호",
  productName: "상품명",
  manufacturer: "제조사",
  quantity: "주문수량",
  gross: "주문액",
} as const;

export interface LoadResult {
  sales: Sale[];
  /** 행에서 추출한 상품 정보 (id → Product 단편) */
  products: Map<
    string,
    {
      id: string;
      name: string;
      categoryCode: string;
      modelNumber: string;
      productCode: string;
      manufacturer: string;
    }
  >;
  warnings: string[];
}

function looksLikeHtml(bytes: Uint8Array): boolean {
  const head = Buffer.from(bytes.slice(0, 64)).toString("ascii").toLowerCase();
  return head.includes("<html") || head.includes("<!doctype html");
}

function detectCharset(bytes: Uint8Array): "utf-8" | "euc-kr" {
  const head = Buffer.from(bytes.slice(0, 1024)).toString("ascii").toLowerCase();
  if (head.includes("charset=euc-kr") || head.includes("charset=ksc5601")) {
    return "euc-kr";
  }
  return "utf-8";
}

function decode(bytes: Uint8Array, charset: "utf-8" | "euc-kr"): string {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function readSheetFromBuffer(
  buffer: Uint8Array,
): XLSX.WorkSheet | null {
  if (looksLikeHtml(buffer)) {
    const charset = detectCharset(buffer);
    const html = decode(buffer, charset);
    // raw: true — HTML 셀 텍스트를 숫자/날짜로 자동 추론하지 않고 원문 그대로 문자열로 둔다.
    // 상품코드(13자리 바코드 등)를 숫자로 추론하면 SheetJS 의 General 서식이
    // sheet_to_json(raw:false) 단계에서 지수표기("1.00085E+12")로 재포맷해버려
    // 원래 정수 코드가 손실된다. 정작 원본 .xls 의 <td>에는 전체 자릿수가
    // 온전히 들어있으므로(class="txt"), 우리 쪽 자동 추론만 꺼도 해결된다.
    // 날짜·수량·매출액은 문자열 그대로 받아도 이후 로직(normalizeDate, Number())이
    // 이미 문자열 입력을 전제로 파싱하므로 영향 없다.
    const wb = XLSX.read(html, { type: "string", raw: true });
    return wb.Sheets[wb.SheetNames[0]] ?? null;
  }
  const wb = XLSX.read(buffer, { type: "buffer" });
  return wb.Sheets[wb.SheetNames[0]] ?? null;
}

const MALL_IDS = new Set(MALLS.map((m) => m.id));
const MALL_COMMISSION = new Map(MALLS.map((m) => [m.id, m.commissionRate]));

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function normalizeKey(s: string): string {
  return s.replace(/[\s ​-‏﻿]/g, "").trim();
}

/**
 * 행에 있는 열 이름이 기대값과 정확히 일치하지 않는 경우(공백·zero-width
 * 문자가 섞이거나, "체결일" 대신 "체결일자" 처럼 변형) 한 번만 스캔해서
 * 매핑을 만들어 둔다.
 */
function buildHeaderMap(
  sample: Record<string, unknown>,
): Record<string, string> {
  const map: Record<string, string> = {};
  const allKeys = Object.keys(sample);
  const normalizedKeys = allKeys.map((k) => [k, normalizeKey(k)] as const);
  for (const [logical, expected] of Object.entries(ENURI_HEADERS)) {
    void logical;
    if (expected in sample) {
      map[expected] = expected;
      continue;
    }
    const target = normalizeKey(expected);
    let found: string | undefined;
    for (const [k, nk] of normalizedKeys) {
      if (nk === target) {
        found = k;
        break;
      }
    }
    if (!found) {
      for (const [k, nk] of normalizedKeys) {
        if (nk.includes(target)) {
          found = k;
          break;
        }
      }
    }
    if (found) map[expected] = found;
  }
  return map;
}

function normalizeDate(
  raw: unknown,
  fallback: string | null,
): string | null {
  if (raw == null || raw === "") return fallback;
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return fallback;
    return `${raw.getFullYear()}-${pad2(raw.getMonth() + 1)}-${pad2(raw.getDate())}`;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const epoch = Date.UTC(1899, 11, 30);
    const ms = epoch + raw * 86400000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return fallback;
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }
  if (typeof raw === "string") {
    // HTML 태그·non-printable 문자 제거 후 연/월/일 추출
    const cleaned = raw.replace(/<[^>]+>/g, "").trim();
    if (!cleaned) return fallback;
    // YYYYMMDD 8자리 통째
    const m8 = cleaned.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (m8) return `${m8[1]}-${m8[2]}-${m8[3]}`;
    // M/D/YY · M/D/YYYY · D/M/YY · D/M/YYYY (구분자: / 또는 -)
    // Excel 미국식 단축 날짜
    const mShort = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
    if (mShort) {
      let mo = Number(mShort[1]);
      let d = Number(mShort[2]);
      let y = Number(mShort[3]);
      if (y < 100) y += y < 70 ? 2000 : 1900;
      if (mo > 12 && d <= 12) [mo, d] = [d, mo];
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100) {
        return `${y}-${pad2(mo)}-${pad2(d)}`;
      }
    }
    // YYYY[separator]MM[separator]DD — 어떤 구분자든 OK
    const m = cleaned.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      if (y >= 2000 && y <= 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        return `${y}-${pad2(mo)}-${pad2(d)}`;
      }
    }
  }
  return fallback;
}

export function loadXlsxFile(
  buffer: Uint8Array,
  fileName: string,
  siteId: SiteId,
): LoadResult {
  const warnings: string[] = [];
  const parsed = parseFileName(fileName);
  if (!parsed) {
    warnings.push(`Unrecognized filename pattern: ${fileName}`);
  }

  const sheet = readSheetFromBuffer(buffer);
  if (!sheet) {
    warnings.push(`No sheet in ${fileName}`);
    return { sales: [], products: new Map(), warnings };
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false,
  });
  if (rows.length === 0)
    return { sales: [], products: new Map(), warnings };

  // 첫 행 기준으로 헤더 매핑 구축 (공백·zero-width·약간의 변형 흡수)
  const headerMap = buildHeaderMap(rows[0]);
  const getCol = (row: Record<string, unknown>, expected: string): unknown => {
    const key = headerMap[expected] ?? expected;
    return row[key];
  };

  // 진단: 헤더와 첫 행 일부를 PowerShell 에 한 번 찍어준다.
  // 사용자가 컬럼 이름·날짜 포맷 문제를 알아볼 수 있도록.
  // eslint-disable-next-line no-console
  console.log(
    `[xlsx] ${fileName}: ${rows.length}행, 헤더(${Object.keys(rows[0]).length}개)=${Object.keys(rows[0]).slice(0, 14).join("|")}`,
  );
  // eslint-disable-next-line no-console
  console.log(
    `[xlsx] ${fileName}: 체결일 매핑→"${headerMap[ENURI_HEADERS.date] ?? "(없음)"}", 첫 행 체결일 값="${String(getCol(rows[0], ENURI_HEADERS.date) ?? "(null)")}" (typeof=${typeof getCol(rows[0], ENURI_HEADERS.date)})`,
  );

  const sales: Sale[] = [];
  const products = new Map<
    string,
    {
      id: string;
      name: string;
      categoryCode: string;
      modelNumber: string;
      productCode: string;
      manufacturer: string;
    }
  >();
  let idx = 0;
  let skippedMall = 0;
  let fallbackDateCount = 0;

  for (const row of rows) {
    const dateRaw = getCol(row, ENURI_HEADERS.date);
    const parsedDate = normalizeDate(dateRaw, null);
    const date = parsedDate ?? parsed?.from ?? null;
    if (!date) continue;
    if (parsedDate === null) fallbackDateCount += 1;

    const mallRaw = getCol(row, ENURI_HEADERS.mall);
    const mallId = String(mallRaw ?? "").trim();
    if (!mallId) continue;
    if (!MALL_IDS.has(mallId)) {
      skippedMall += 1;
      continue;
    }

    const productCode = String(getCol(row, ENURI_HEADERS.productCode) ?? "").trim();
    const modelRaw = String(getCol(row, ENURI_HEADERS.enuriModel) ?? "").trim();
    const hasModel = modelRaw !== "" && modelRaw !== "0";
    const productName =
      String(getCol(row, ENURI_HEADERS.productName) ?? "").trim() ||
      String(getCol(row, ENURI_HEADERS.mallProductName) ?? "").trim() ||
      productCode;
    const productId = hasModel ? `M-${modelRaw}` : `C-${productCode}`;
    const rowCat = String(getCol(row, ENURI_HEADERS.category) ?? "").trim();
    // 파일명 카테고리 prefix 와 행 카테고리가 불일치하면 파일 카테고리를 사용.
    // 에누리에서 한 상품이 여러 카테고리에 cross-listed 돼 있을 때, 다른 카테고리
    // 파일에 같은 상품코드가 등장해도 매출이 해당 파일의 카테고리로 귀속되게 한다.
    const fileCat = parsed?.categoryCode ?? "";
    const categoryCode = fileCat && !rowCat.startsWith(fileCat) ? fileCat : rowCat;
    const manufacturer = String(getCol(row, ENURI_HEADERS.manufacturer) ?? "").trim();

    const quantity = Number(getCol(row, ENURI_HEADERS.quantity) ?? 1) || 1;
    const gross = Number(getCol(row, ENURI_HEADERS.gross) ?? 0) || 0;
    if (gross <= 0) continue;

    const rate = MALL_COMMISSION.get(mallId) ?? 0;
    const commission = Math.round(gross * rate);

    idx += 1;
    sales.push({
      id: `${siteId}-${fileName}-${idx}`,
      date,
      siteId,
      productId,
      mallId,
      quantity,
      grossAmount: gross,
      commission,
      categoryCode,
    });

    if (!products.has(productId)) {
      products.set(productId, {
        id: productId,
        name: productName,
        categoryCode,
        modelNumber: hasModel ? modelRaw : "",
        productCode,
        manufacturer,
      });
    } else if (manufacturer) {
      const existing = products.get(productId)!;
      if (!existing.manufacturer) existing.manufacturer = manufacturer;
    }
  }

  if (skippedMall > 0) {
    warnings.push(
      `${fileName}: 매핑되지 않은 쇼핑몰 코드 ${skippedMall}행 건너뜀`,
    );
  }
  // eslint-disable-next-line no-console
  console.log(
    `[xlsx] ${fileName}: 처리완료 sales=${sales.length}, 체결일 폴백=${fallbackDateCount}행 (파일명 시작일로 대체)`,
  );
  if (fallbackDateCount > 0 && fallbackDateCount === sales.length) {
    warnings.push(
      `${fileName}: 모든 행의 체결일 인식 실패 → 파일명 시작일로 대체됨. 일별 차트가 한 점으로 보임.`,
    );
  }
  return { sales, products, warnings };
}

/**
 * 파싱된 원시 행 (카탈로그 페이지에서 사용 예정).
 */
export interface RawRow {
  date: string;
  siteId: SiteId;
  mallId: string;
  productCode: string;
  categoryCode: string;
  productName: string;
  mallProductName: string;
  manufacturer: string;
  quantity: number;
  grossAmount: number;
}

export function loadXlsxRaw(
  buffer: Uint8Array,
  fileName: string,
  siteId: SiteId,
): { rows: RawRow[]; warnings: string[] } {
  const warnings: string[] = [];
  const parsed = parseFileName(fileName);
  const sheet = readSheetFromBuffer(buffer);
  if (!sheet) return { rows: [], warnings: [`No sheet in ${fileName}`] };

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false,
  });

  const rows: RawRow[] = [];
  for (const row of raw) {
    const date = normalizeDate(row[ENURI_HEADERS.date], parsed?.from ?? null) ?? "";
    rows.push({
      date,
      siteId,
      mallId: String(row[ENURI_HEADERS.mall] ?? "").trim(),
      productCode: String(row[ENURI_HEADERS.productCode] ?? "").trim(),
      categoryCode: String(row[ENURI_HEADERS.category] ?? "").trim(),
      productName: String(row[ENURI_HEADERS.productName] ?? "").trim(),
      mallProductName: String(row[ENURI_HEADERS.mallProductName] ?? "").trim(),
      manufacturer: String(row[ENURI_HEADERS.manufacturer] ?? "").trim(),
      quantity: Number(row[ENURI_HEADERS.quantity] ?? 0) || 0,
      grossAmount: Number(row[ENURI_HEADERS.gross] ?? 0) || 0,
    });
  }
  return { rows, warnings };
}
