import type { CategoryNode } from "./types";

/**
 * 카테고리 코드 → 이름 매핑 (계층 구조).
 *
 * 코드 길이 규칙: 2자리=대분류, 4자리=중분류, 6자리=소분류.
 * 실제 매핑이 도착하면 이 배열을 교체.
 */
export const CATEGORIES: CategoryNode[] = [
  { code: "15", name: "식품", parentCode: null, depth: 1 },
  { code: "1511", name: "라면·간편식", parentCode: "15", depth: 2 },
  { code: "151101", name: "봉지라면", parentCode: "1511", depth: 3 },
  { code: "151102", name: "컵라면", parentCode: "1511", depth: 3 },
  { code: "151103", name: "즉석밥", parentCode: "1511", depth: 3 },
  { code: "1512", name: "가공식품", parentCode: "15", depth: 2 },
  { code: "151201", name: "통조림", parentCode: "1512", depth: 3 },
  { code: "151202", name: "스낵", parentCode: "1512", depth: 3 },

  { code: "20", name: "가전", parentCode: null, depth: 1 },
  { code: "2011", name: "주방가전", parentCode: "20", depth: 2 },
  { code: "201101", name: "전자레인지", parentCode: "2011", depth: 3 },
  { code: "201102", name: "에어프라이어", parentCode: "2011", depth: 3 },
  { code: "2012", name: "TV·영상", parentCode: "20", depth: 2 },
  { code: "201201", name: "LED TV", parentCode: "2012", depth: 3 },

  { code: "30", name: "패션", parentCode: null, depth: 1 },
  { code: "3011", name: "남성의류", parentCode: "30", depth: 2 },
  { code: "301101", name: "남성 티셔츠", parentCode: "3011", depth: 3 },
  { code: "3012", name: "여성의류", parentCode: "30", depth: 2 },
  { code: "301201", name: "여성 원피스", parentCode: "3012", depth: 3 },

  { code: "40", name: "PC/주변기기", parentCode: null, depth: 1 },
  { code: "4011", name: "노트북", parentCode: "40", depth: 2 },
  { code: "401101", name: "게이밍 노트북", parentCode: "4011", depth: 3 },
  { code: "401102", name: "사무용 노트북", parentCode: "4011", depth: 3 },
  { code: "4012", name: "주변기기", parentCode: "40", depth: 2 },
  { code: "401201", name: "키보드", parentCode: "4012", depth: 3 },
  { code: "401202", name: "마우스", parentCode: "4012", depth: 3 },

  { code: "50", name: "뷰티", parentCode: null, depth: 1 },
  { code: "5011", name: "스킨케어", parentCode: "50", depth: 2 },
  { code: "501101", name: "토너", parentCode: "5011", depth: 3 },
];

const CATEGORY_BY_CODE = new Map(CATEGORIES.map((c) => [c.code, c]));

export function getCategory(code: string): CategoryNode | undefined {
  return CATEGORY_BY_CODE.get(code);
}

export function getCategoryName(code: string): string {
  return CATEGORY_BY_CODE.get(code)?.name ?? code;
}

export function getCategoryPath(code: string): string[] {
  const path: string[] = [];
  let cur = CATEGORY_BY_CODE.get(code);
  while (cur) {
    path.unshift(cur.name);
    cur = cur.parentCode ? CATEGORY_BY_CODE.get(cur.parentCode) : undefined;
  }
  return path;
}

export function getTopCategory(code: string): CategoryNode | undefined {
  let cur = CATEGORY_BY_CODE.get(code);
  while (cur && cur.parentCode) cur = CATEGORY_BY_CODE.get(cur.parentCode);
  return cur;
}

export function getChildren(parentCode: string | null): CategoryNode[] {
  return CATEGORIES.filter((c) => c.parentCode === parentCode);
}

export function getLeafCategories(): CategoryNode[] {
  const hasChildren = new Set(
    CATEGORIES.map((c) => c.parentCode).filter((p): p is string => !!p),
  );
  return CATEGORIES.filter((c) => !hasChildren.has(c.code));
}
