import * as XLSX from "xlsx";
import type { Sale, SiteId } from "../types";
import { parseFileName } from "./filename";

/**
 * Excel 행 → Sale 정규화.
 *
 * 실제 헤더 구조가 도착하면 HEADER_MAP을 그에 맞게 갱신.
 * 현재는 컬럼명 후보를 여러 개 받아 매핑 시도하는 관대한 구조.
 */

const HEADER_CANDIDATES = {
  date: ["일자", "날짜", "date", "DATE"],
  productName: ["상품명", "제품명", "productName", "PRODUCT_NAME"],
  productId: ["상품코드", "상품ID", "productId", "PRODUCT_ID", "PRODUCT_CODE"],
  mallCode: ["쇼핑몰코드", "쇼핑몰", "MALL", "MALL_CODE", "mall"],
  grossAmount: ["거래액", "GMV", "매출액", "결제금액", "amount", "GROSS"],
  quantity: ["수량", "판매수량", "qty", "QUANTITY"],
} satisfies Record<string, string[]>;

type FieldName = keyof typeof HEADER_CANDIDATES;

function findHeader(headers: string[], candidates: string[]): string | null {
  for (const c of candidates) {
    const lower = c.toLowerCase();
    const hit = headers.find((h) => h.toLowerCase() === lower);
    if (hit) return hit;
  }
  return null;
}

export interface LoadResult {
  sales: Sale[];
  warnings: string[];
}

export function loadXlsxFile(
  buffer: ArrayBuffer | Buffer,
  fileName: string,
  siteId: SiteId,
): LoadResult {
  const parsed = parseFileName(fileName);
  const warnings: string[] = [];
  if (!parsed) {
    warnings.push(`Unrecognized filename pattern: ${fileName}`);
  }

  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  });

  if (rows.length === 0) return { sales: [], warnings };

  const headers = Object.keys(rows[0]);
  const headerMap: Partial<Record<FieldName, string>> = {};
  for (const field of Object.keys(HEADER_CANDIDATES) as FieldName[]) {
    const hit = findHeader(headers, HEADER_CANDIDATES[field]);
    if (hit) headerMap[field] = hit;
  }

  const required: FieldName[] = ["productName", "mallCode", "grossAmount"];
  const missing = required.filter((f) => !headerMap[f]);
  if (missing.length > 0) {
    warnings.push(
      `Missing required columns in ${fileName}: ${missing.join(", ")}`,
    );
    return { sales: [], warnings };
  }

  const sales: Sale[] = [];
  let idx = 0;
  const fallbackFrom = parsed?.from ?? null;
  for (const row of rows) {
    const dateRaw = headerMap.date ? row[headerMap.date] : null;
    const date = (typeof dateRaw === "string" ? dateRaw : null) ?? fallbackFrom;
    if (!date) continue;

    const productName = String(row[headerMap.productName!] ?? "").trim();
    const productId = headerMap.productId
      ? String(row[headerMap.productId] ?? "").trim() || productName
      : productName;
    const mallId = String(row[headerMap.mallCode!] ?? "").trim().toLowerCase();
    const grossAmount = Number(row[headerMap.grossAmount!] ?? 0) || 0;
    const quantity = headerMap.quantity
      ? Number(row[headerMap.quantity] ?? 1) || 1
      : 1;

    idx += 1;
    sales.push({
      id: `${siteId}-${fileName}-${idx}`,
      date,
      siteId,
      productId,
      mallId: mallId as Sale["mallId"],
      quantity,
      grossAmount,
      commission: 0,
    });
  }

  return { sales, warnings };
}
