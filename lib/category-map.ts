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
  { code: "1501", name: "건강식품", parentCode: "15", depth: 2 },
  { code: "1502", name: "농산물", parentCode: "15", depth: 2 },
  { code: "1503", name: "축산물", parentCode: "15", depth: 2 },
  { code: "1505", name: "커피/차", parentCode: "15", depth: 2 },
  { code: "1506", name: "헬스/다이어트/이너뷰티", parentCode: "15", depth: 2 },
  { code: "1507", name: "오일/소스/양념", parentCode: "15", depth: 2 },
  { code: "1508", name: "과자/초콜릿/디저트", parentCode: "15", depth: 2 },
  { code: "1513", name: "생수/음료/주류", parentCode: "15", depth: 2 },
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
  // 1501 소분류 (건강식품)
  { code: "150100", name: "★관리용", parentCode: "1501", depth: 3 },
  { code: "150101", name: "영양제", parentCode: "1501", depth: 3 },
  { code: "150102", name: "비타민/미네랄", parentCode: "1501", depth: 3 },
  { code: "150103", name: "유산균", parentCode: "1501", depth: 3 },
  { code: "150104", name: "녹용/흑염소", parentCode: "1501", depth: 3 },
  { code: "150105", name: "홍삼", parentCode: "1501", depth: 3 },
  { code: "150107", name: "건강즙/환/분말", parentCode: "1501", depth: 3 },
  { code: "150112", name: "temp_건강환/분말", parentCode: "1501", depth: 3 },
  { code: "150124", name: "환자영양식/균형식", parentCode: "1501", depth: 3 },
  { code: "150125", name: "프로폴리스/꿀", parentCode: "1501", depth: 3 },
  // 1502 소분류 (농산물)
  { code: "150200", name: "★관리용", parentCode: "1502", depth: 3 },
  { code: "150202", name: "쌀/잡곡", parentCode: "1502", depth: 3 },
  { code: "150203", name: "과일", parentCode: "1502", depth: 3 },
  { code: "150204", name: "채소", parentCode: "1502", depth: 3 },
  { code: "150205", name: "견과류", parentCode: "1502", depth: 3 },
  { code: "150215", name: "김치", parentCode: "1502", depth: 3 },
  // 1503 소분류 (축산물)
  { code: "150300", name: "★관리용", parentCode: "1503", depth: 3 },
  { code: "150301", name: "소고기 양념육", parentCode: "1503", depth: 3 },
  { code: "150306", name: "소고기", parentCode: "1503", depth: 3 },
  { code: "150308", name: "오리고기", parentCode: "1503", depth: 3 },
  { code: "150312", name: "돼지고기", parentCode: "1503", depth: 3 },
  { code: "150314", name: "양/염소고기", parentCode: "1503", depth: 3 },
  { code: "150315", name: "축산선물세트", parentCode: "1503", depth: 3 },
  { code: "150316", name: "햄/소시지/육포", parentCode: "1503", depth: 3 },
  { code: "150317", name: "닭고기/닭가슴살", parentCode: "1503", depth: 3 },
  { code: "150320", name: "계란/알류", parentCode: "1503", depth: 3 },
  { code: "150322", name: "곱창/막창/부속부위", parentCode: "1503", depth: 3 },
  // 1505 소분류 (커피/차)
  { code: "150500", name: "★관리용", parentCode: "1505", depth: 3 },
  { code: "150501", name: "커피믹스", parentCode: "1505", depth: 3 },
  { code: "150507", name: "녹차/보이차/꽃차", parentCode: "1505", depth: 3 },
  { code: "150510", name: "원두/드립/더치", parentCode: "1505", depth: 3 },
  { code: "150513", name: "핫초코/아이스티", parentCode: "1505", depth: 3 },
  { code: "150519", name: "홈카페 재료", parentCode: "1505", depth: 3 },
  { code: "150520", name: "커피/차 선물세트", parentCode: "1505", depth: 3 },
  { code: "150522", name: "캡슐커피", parentCode: "1505", depth: 3 },
  { code: "150525", name: "율무/곡물차", parentCode: "1505", depth: 3 },
  { code: "150527", name: "유자/과일차", parentCode: "1505", depth: 3 },
  { code: "150528", name: "홍차/밀크티", parentCode: "1505", depth: 3 },
  { code: "150529", name: "쌍화/생강/전통차", parentCode: "1505", depth: 3 },
  // 1506 소분류 (헬스/다이어트/이너뷰티)
  { code: "150600", name: "temp_★관리용", parentCode: "1506", depth: 3 },
  { code: "150601", name: "프로틴/식사대용", parentCode: "1506", depth: 3 },
  { code: "150602", name: "운동/퍼포먼스", parentCode: "1506", depth: 3 },
  { code: "150603", name: "다이어트/식단관리", parentCode: "1506", depth: 3 },
  { code: "150604", name: "콜라겐", parentCode: "1506", depth: 3 },
  { code: "150605", name: "이너뷰티/피부케어", parentCode: "1506", depth: 3 },
  { code: "150610", name: "temp_시니어케어 음료", parentCode: "1506", depth: 3 },
  { code: "150619", name: "수면/멘탈케어", parentCode: "1506", depth: 3 },
  // 1507 소분류 (오일/소스/양념)
  { code: "150700", name: "★관리용", parentCode: "1507", depth: 3 },
  { code: "150704", name: "식초/액젓/양념", parentCode: "1507", depth: 3 },
  { code: "150705", name: "설탕/소금", parentCode: "1507", depth: 3 },
  { code: "150706", name: "소스/드레싱", parentCode: "1507", depth: 3 },
  { code: "150707", name: "가루/분말류", parentCode: "1507", depth: 3 },
  { code: "150708", name: "오일/식용유", parentCode: "1507", depth: 3 },
  { code: "150713", name: "잼/시럽", parentCode: "1507", depth: 3 },
  { code: "150715", name: "장류/낫토", parentCode: "1507", depth: 3 },
  { code: "150716", name: "코인육수/조미료", parentCode: "1507", depth: 3 },
  { code: "150717", name: "오일/혼합 선물세트", parentCode: "1507", depth: 3 },
  // 1508 소분류 (과자/초콜릿/디저트)
  { code: "150800", name: "★관리용", parentCode: "1508", depth: 3 },
  { code: "150801", name: "과자/쿠키/파이", parentCode: "1508", depth: 3 },
  { code: "150802", name: "초콜릿", parentCode: "1508", depth: 3 },
  { code: "150808", name: "한과/떡", parentCode: "1508", depth: 3 },
  { code: "150809", name: "temp_DIY/간편베이킹", parentCode: "1508", depth: 3 },
  { code: "150813", name: "빵/베이커리", parentCode: "1508", depth: 3 },
  { code: "150819", name: "아이스크림/빙수", parentCode: "1508", depth: 3 },
  { code: "150824", name: "사탕/젤리", parentCode: "1508", depth: 3 },
  { code: "150825", name: "시리얼/에너지바", parentCode: "1508", depth: 3 },
  // 1513 소분류 (생수/음료/주류)
  { code: "151300", name: "★관리용", parentCode: "1513", depth: 3 },
  { code: "151301", name: "생수", parentCode: "1513", depth: 3 },
  { code: "151302", name: "탄산수/탄산음료", parentCode: "1513", depth: 3 },
  { code: "151303", name: "커피/차음료", parentCode: "1513", depth: 3 },
  { code: "151304", name: "우유/연유/요구르트", parentCode: "1513", depth: 3 },
  { code: "151305", name: "주스/과일음료", parentCode: "1513", depth: 3 },
  { code: "151306", name: "두유/식물성음료", parentCode: "1513", depth: 3 },
  { code: "151310", name: "비타민/에너지음료", parentCode: "1513", depth: 3 },
  { code: "151312", name: "주류/전통주/와인", parentCode: "1513", depth: 3 },
  { code: "151313", name: "논알콜/무알콜음료", parentCode: "1513", depth: 3 },
  { code: "151315", name: "숙취해소제", parentCode: "1513", depth: 3 },
  { code: "151317", name: "이온/스포츠음료", parentCode: "1513", depth: 3 },
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

/**
 * 여러 중분류를 묶어 한 버튼으로 보는 그룹.
 * 토글 값은 codes.join(",") (예: "1501,1506") 로 콤마 prefix 가 된다.
 */
export interface CategoryGroup {
  id: string;
  name: string;
  codes: string[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  { id: "health", name: "건기식", codes: ["1501", "1506"] },
];
