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
  { code: "1516", name: "냉장/냉동/간편식", parentCode: "15", depth: 2 },
  { code: "1504", name: "수산물", parentCode: "15", depth: 2 },
  // 1511 소분류
  { code: "151100", name: "★관리용", parentCode: "1511", depth: 3 },
  { code: "151101", name: "봉지라면", parentCode: "1511", depth: 3 },
  { code: "151102", name: "당면/사리/파스타면", parentCode: "1511", depth: 3 },
  { code: "151103", name: "햇반/즉석밥/죽", parentCode: "1511", depth: 3 },
  { code: "151105", name: "참치/스팸/통조림", parentCode: "1511", depth: 3 },
  { code: "151108", name: "치즈/버터", parentCode: "1511", depth: 3 },
  { code: "151116", name: "카레/짜장/스프", parentCode: "1511", depth: 3 },
  { code: "151119", name: "temp_냉동/냉장 즉석면요리", parentCode: "1511", depth: 3 },
  { code: "151120", name: "컵라면", parentCode: "1511", depth: 3 },
  // 1516 소분류 (냉장/냉동/간편식)
  { code: "151600", name: "★관리용", parentCode: "1516", depth: 3 },
  { code: "151601", name: "만두/교자", parentCode: "1516", depth: 3 },
  { code: "151603", name: "치킨/돈까스/탕수육", parentCode: "1516", depth: 3 },
  { code: "151604", name: "떡갈비/전/함박", parentCode: "1516", depth: 3 },
  { code: "151605", name: "떡볶이/튀김/순대", parentCode: "1516", depth: 3 },
  { code: "151606", name: "피자/핫도그/햄버거", parentCode: "1516", depth: 3 },
  { code: "151607", name: "냉동밥/면요리", parentCode: "1516", depth: 3 },
  { code: "151608", name: "밀키트", parentCode: "1516", depth: 3 },
  { code: "151609", name: "즉석탕/찌개", parentCode: "1516", depth: 3 },
  { code: "151610", name: "두부/샐러드/샌드위치", parentCode: "1516", depth: 3 },
  { code: "151611", name: "안주/양념닭발/기타", parentCode: "1516", depth: 3 },
  { code: "151617", name: "햄/어묵/맛살", parentCode: "1516", depth: 3 },
  { code: "151618", name: "반찬류", parentCode: "1516", depth: 3 },
  // 1504 소분류 (수산물)
  { code: "150400", name: "★관리용", parentCode: "1504", depth: 3 },
  { code: "150401", name: "생선/고등어/굴비", parentCode: "1504", depth: 3 },
  { code: "150403", name: "김/미역/해조류", parentCode: "1504", depth: 3 },
  { code: "150404", name: "건어물/쥐포", parentCode: "1504", depth: 3 },
  { code: "150405", name: "날치알/기타알류", parentCode: "1504", depth: 3 },
  { code: "150408", name: "수산물 세트", parentCode: "1504", depth: 3 },
  { code: "150409", name: "젓갈/명란", parentCode: "1504", depth: 3 },
  { code: "150410", name: "전복/조개/해산물", parentCode: "1504", depth: 3 },
  { code: "150413", name: "오징어/낙지/문어", parentCode: "1504", depth: 3 },
  { code: "150414", name: "새우/게/랍스터", parentCode: "1504", depth: 3 },
  { code: "150417", name: "멸치/황태", parentCode: "1504", depth: 3 },
  { code: "150418", name: "간편해물모듬", parentCode: "1504", depth: 3 },
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

export function getSubCategory(code: string): CategoryNode | undefined {
  let cur = resolveCode(code);
  while (cur && cur.depth > 3) {
    cur = cur.parentCode ? CATEGORY_BY_CODE.get(cur.parentCode) : undefined;
  }
  return cur && cur.depth === 3 ? cur : undefined;
}

export function getChildren(parentCode: string | null): CategoryNode[] {
  return CATEGORIES.filter((c) => c.parentCode === parentCode);
}

/** 입력 코드의 중분류 (4자리, depth=2) 노드를 찾는다. */
export function getMidCategory(code: string): CategoryNode | undefined {
  let cur = resolveCode(code);
  while (cur && cur.depth > 2) {
    cur = cur.parentCode ? CATEGORY_BY_CODE.get(cur.parentCode) : undefined;
  }
  return cur && cur.depth === 2 ? cur : undefined;
}
