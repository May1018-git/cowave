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
    const wb = XLSX.read(html, { type: "string" });
    return wb.Sheets[wb.SheetNames[0]] ?? null;
  }
  const wb = XLSX.read(buffer, { type: "buffer" });
  return wb.Sheets[wb.SheetNames[0]] ?? null;
}

const MALL_IDS = new Set(MALLS.map((m) => m.id));
const MALL_COMMISSION = new Map(MALLS.map((m) => [m.id, m.commissionRate]));

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

  const sales: Sale[] = [];
  const products = new Map<
    string,
    {
      id: string;
      name: string;
      categoryCode: string;
      modelNumber: string;
      productCode: string;
    }
  >();
  let idx = 0;
  let skippedMall = 0;

  for (const row of rows) {
    const dateRaw = row[ENURI_HEADERS.date];
    const date =
      typeof dateRaw === "string" && dateRaw.length >= 10
        ? dateRaw.slice(0, 10)
        : parsed?.from ?? null;
    if (!date) continue;

    const mallRaw = row[ENURI_HEADERS.mall];
    const mallId = String(mallRaw ?? "").trim();
    if (!mallId) continue;
    if (!MALL_IDS.has(mallId)) {
      skippedMall += 1;
      continue;
    }

    const productCode = String(row[ENURI_HEADERS.productCode] ?? "").trim();
    const modelRaw = String(row[ENURI_HEADERS.enuriModel] ?? "").trim();
    const hasModel = modelRaw !== "" && modelRaw !== "0";
    const productName =
      String(row[ENURI_HEADERS.productName] ?? "").trim() ||
      String(row[ENURI_HEADERS.mallProductName] ?? "").trim() ||
      productCode;
    const productId = hasModel ? `M-${modelRaw}` : `C-${productCode}`;
    const categoryCode = String(row[ENURI_HEADERS.category] ?? "").trim();

    const quantity = Number(row[ENURI_HEADERS.quantity] ?? 1) || 1;
    const gross = Number(row[ENURI_HEADERS.gross] ?? 0) || 0;
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
    });

    if (!products.has(productId)) {
      products.set(productId, {
        id: productId,
        name: productName,
        categoryCode,
        modelNumber: hasModel ? modelRaw : "",
        productCode,
      });
    }
  }

  if (skippedMall > 0) {
    warnings.push(
      `${fileName}: 매핑되지 않은 쇼핑몰 코드 ${skippedMall}행 건너뜀`,
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
    const dateRaw = row[ENURI_HEADERS.date];
    const date =
      typeof dateRaw === "string" && dateRaw.length >= 10
        ? dateRaw.slice(0, 10)
        : parsed?.from ?? "";
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
