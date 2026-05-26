import type { CategoryNode } from "./types";

/**
 * 카테고리 코드 → 이름 매핑 (계층 구조).
 *
 * 코드 길이 규칙:
 *   2자리 = 대분류 (예: "15" 식품)
 *   4자리 = 중분류 (예: "1511" 라면/즉석밥/통조림)
 *   6자리 = 소분류 (예: "151101" 봉지라면)
 *   8자리 = 세부분류 (소분류 하위 — 매핑되지 않은 경우 자동으로 6자리로 롤업)
 */
export const CATEGORIES: CategoryNode[] = [
  // 대분류
  { code: "15", name: "식품", parentCode: null, depth: 1 },
  // 중분류
  { code: "1511", name: "라면/즉석밥/통조림", parentCode: "15", depth: 2 },
  // 소분류 (사용자 제공)
  { code: "151100", name: "temp_★관리용", parentCode: "1511", depth: 3 },
  { code: "151101", name: "봉지라면", parentCode: "1511", depth: 3 },
  { code: "151102", name: "당면/사리/파스타면", parentCode: "1511", depth: 3 },
  { code: "151103", name: "햇반/즉석밥/죽", parentCode: "1511", depth: 3 },
  { code: "151105", name: "참치/스팸/통조림", parentCode: "1511", depth: 3 },
  { code: "151108", name: "치즈/버터", parentCode: "1511", depth: 3 },
  { code: "151116", name: "카레/짜장/스프", parentCode: "1511", depth: 3 },
  { code: "151119", name: "temp_냉동/냉장 즉석면요리", parentCode: "1511", depth: 3 },
  { code: "151120", name: "컵라면", parentCode: "1511", depth: 3 },
];

const CATEGORY_BY_CODE = new Map(CATEGORIES.map((c) => [c.code, c]));

/**
 * 입력 코드가 직접 매핑되지 않으면, 끝 자리를 잘라가며 상위 코드를 찾는다.
 * 예: "15110512" (매핑 없음) → "151105" 참치/스팸/통조림으로 롤업.
 */
function resolveCode(code: string): CategoryNode | undefined {
  let cur = code;
  while (cur.length >= 2) {
    const node = CATEGORY_BY_CODE.get(cur);
    if (node) return node;
    cur = cur.slice(0, -2);
  }
  return undefined;
}

export function getCategory(code: string): CategoryNode | undefined {
  return resolveCode(code);
}

export function getCategoryName(code: string): string {
  return resolveCode(code)?.name ?? code;
}

export function getCategoryPath(code: string): string[] {
  const path: string[] = [];
  let cur = resolveCode(code);
  while (cur) {
    path.unshift(cur.name);
    cur = cur.parentCode ? CATEGORY_BY_CODE.get(cur.parentCode) : undefined;
  }
  return path;
}

export function getTopCategory(code: string): CategoryNode | undefined {
  let cur = resolveCode(code);
  while (cur && cur.parentCode) cur = CATEGORY_BY_CODE.get(cur.parentCode);
  return cur;
}

export function getChildren(parentCode: string | null): CategoryNode[] {
  return CATEGORIES.filter((c) => c.parentCode === parentCode);
}
