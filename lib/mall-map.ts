import type { Mall, MallId } from "./types";

/**
 * 쇼핑몰 코드 → 이름/수수료율 매핑.
 * 실제 매핑이 도착하면 이 배열을 교체.
 */
export const MALLS: Mall[] = [
  { id: "naver", name: "네이버 스마트스토어", commissionRate: 0.025 },
  { id: "coupang", name: "쿠팡", commissionRate: 0.04 },
  { id: "11st", name: "11번가", commissionRate: 0.03 },
  { id: "gmarket", name: "G마켓", commissionRate: 0.028 },
  { id: "auction", name: "옥션", commissionRate: 0.028 },
  { id: "own", name: "자사몰", commissionRate: 0.05 },
];

const MALL_BY_ID = new Map(MALLS.map((m) => [m.id, m]));

export function getMall(id: MallId): Mall | undefined {
  return MALL_BY_ID.get(id);
}

export function getMallName(id: MallId): string {
  return MALL_BY_ID.get(id)?.name ?? id;
}
