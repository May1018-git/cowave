import type { Mall, MallId } from "./types";

/**
 * 쇼핑몰 코드 → 이름 매핑.
 * 코드는 외부(에누리) 시스템의 숫자 ID를 그대로 사용한다.
 *
 * commissionRate 는 임시값. 실 운영 수수료율로 교체 가능.
 */
export const MALLS: Mall[] = [
  { id: "7861", name: "쿠팡", commissionRate: 0.04 },
  { id: "6875", name: "스마트스토어", commissionRate: 0.025 },
  { id: "4027", name: "옥션", commissionRate: 0.028 },
  { id: "536", name: "G마켓", commissionRate: 0.028 },
  { id: "5910", name: "11번가", commissionRate: 0.03 },
  { id: "49", name: "롯데ON", commissionRate: 0.03 },
  { id: "47", name: "신세계몰", commissionRate: 0.03 },
  { id: "6361", name: "홈플러스", commissionRate: 0.03 },
  { id: "57", name: "현대Hmall", commissionRate: 0.03 },
  { id: "374", name: "이마트몰", commissionRate: 0.03 },
  { id: "6193", name: "동원몰", commissionRate: 0.03 },
  { id: "75", name: "GS SHOP", commissionRate: 0.03 },
  { id: "44244", name: "배민상회", commissionRate: 0.035 },
  { id: "974", name: "NS몰", commissionRate: 0.03 },
  { id: "9011", name: "SK스토아", commissionRate: 0.03 },
  { id: "29297", name: "오늘의집", commissionRate: 0.035 },
  { id: "20883", name: "쇼핑엔티", commissionRate: 0.03 },
  { id: "806", name: "CJ온스타일", commissionRate: 0.03 },
  { id: "663", name: "롯데홈쇼핑", commissionRate: 0.03 },
  { id: "6547", name: "롯데백화점", commissionRate: 0.03 },
  { id: "5438", name: "우체국쇼핑", commissionRate: 0.025 },
  { id: "7455", name: "롯데마트몰", commissionRate: 0.03 },
  { id: "46826", name: "어바웃펫", commissionRate: 0.035 },
  { id: "7851", name: "더현대닷컴", commissionRate: 0.03 },
  { id: "6389", name: "패션플러스", commissionRate: 0.03 },
  { id: "27550", name: "쿠쿠몰", commissionRate: 0.03 },
  { id: "24763", name: "무신사스토어", commissionRate: 0.03 },
];

const MALL_BY_ID = new Map(MALLS.map((m) => [m.id, m]));

export function getMall(id: MallId): Mall | undefined {
  return MALL_BY_ID.get(id);
}

export function getMallName(id: MallId): string {
  return MALL_BY_ID.get(id)?.name ?? id;
}
