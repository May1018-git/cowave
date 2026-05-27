import { format, subDays } from "date-fns";
import { CATEGORIES } from "./category-map";
import { MALLS } from "./mall-map";
import { SITES } from "./sites";
import type { MallId, Product, Sale, SiteId } from "./types";

const DAYS_OF_HISTORY = 400;

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const rand = lcg(20250526);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function int(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

/**
 * 사용자 매핑(1511 라면/즉석밥/통조림)에 맞춘 상품 시드.
 * 실제 데이터 소스가 붙기 전까지 UI 데모용.
 */
const PRODUCT_TEMPLATES: {
  categoryCode: string;
  names: string[];
  priceRange: [number, number];
}[] = [
  {
    categoryCode: "151101",
    names: [
      "진라면 매운맛 5입",
      "신라면 5입",
      "안성탕면 5입",
      "너구리 5입",
      "짜파게티 5입",
    ],
    priceRange: [3500, 6500],
  },
  {
    categoryCode: "151102",
    names: ["오뚜기 옛날당면 500g", "백설 스파게티면 500g", "라이스페이퍼 300g"],
    priceRange: [3500, 9500],
  },
  {
    categoryCode: "151103",
    names: ["햇반 12입", "오뚜기밥 12입", "햇반 흑미밥 8입", "햇반 컵반 6입"],
    priceRange: [9900, 19500],
  },
  {
    categoryCode: "151105",
    names: [
      "동원 참치캔 200g x4",
      "스팸 클래식 200g x3",
      "꽁치통조림 400g",
      "오뚜기 후랑크 200g",
      "캔햄 선물세트",
    ],
    priceRange: [6500, 35000],
  },
  {
    categoryCode: "151108",
    names: ["서울우유 체다치즈 200g", "앵커 무염버터 250g", "필라델피아 크림치즈 200g"],
    priceRange: [5500, 12500],
  },
  {
    categoryCode: "151116",
    names: ["오뚜기 3분카레 200g x4", "오뚜기 짜장 200g x4", "크노르 스프 5종"],
    priceRange: [4900, 11500],
  },
  {
    categoryCode: "151120",
    names: [
      "신라면 컵 6입",
      "왕뚜껑 6입",
      "육개장 컵라면 6입",
      "튀김우동 컵 6입",
    ],
    priceRange: [5000, 9500],
  },
];

function inferManufacturer(name: string): string {
  const m: [RegExp, string][] = [
    [/진라면|오뚜기|3분카레|3분 카레|짜장|후랑크|옛날당면/, "오뚜기"],
    [/신라면|짜파게티|너구리|안성탕면|육개장/, "농심"],
    [/햇반/, "CJ제일제당"],
    [/스팸|백설|컵반/, "CJ제일제당"],
    [/동원|참치캔/, "동원F&B"],
    [/왕뚜껑|튀김우동/, "팔도"],
    [/서울우유|체다치즈/, "서울우유"],
    [/앵커/, "앵커"],
    [/필라델피아/, "필라델피아"],
    [/크노르/, "유니레버"],
    [/꽁치통조림|캔햄|라이스페이퍼/, "기타"],
  ];
  for (const [re, brand] of m) if (re.test(name)) return brand;
  return "기타";
}

function buildProducts(): Product[] {
  const products: Product[] = [];
  let idx = 0;
  for (const tpl of PRODUCT_TEMPLATES) {
    for (const name of tpl.names) {
      idx += 1;
      const id = `P${idx.toString().padStart(4, "0")}`;
      products.push({
        id,
        name,
        categoryCode: tpl.categoryCode,
        modelNumber: `${1_000_000 + idx}`,
        productCode: id,
        manufacturer: inferManufacturer(name),
        basePrice: int(tpl.priceRange[0], tpl.priceRange[1]),
      });
    }
  }
  return products;
}

const PRODUCTS = buildProducts();

const SITE_CATEGORY_WEIGHT: Record<SiteId, Record<string, number>> = {
  enuri: { "15": 1.4 },
  danawa: { "15": 0.7 },
};

/** 실제 운영 점유율을 어림한 시드 가중치. */
const MALL_WEIGHT: Record<MallId, number> = {
  "7861": 2.0, // 쿠팡
  "6875": 1.7, // 스마트스토어
  "536": 1.0, // G마켓
  "4027": 0.9, // 옥션
  "5910": 1.0, // 11번가
  "374": 0.7, // 이마트몰
  "6361": 0.6, // 홈플러스
  "7455": 0.6, // 롯데마트몰
  "47": 0.5, // 신세계몰
  "49": 0.5, // 롯데ON
  "57": 0.4, // 현대Hmall
  "75": 0.4, // GS SHOP
  "974": 0.4, // NS몰
  "806": 0.4, // CJ온스타일
  "663": 0.3, // 롯데홈쇼핑
  "9011": 0.3, // SK스토아
  "6193": 0.3, // 동원몰
  "44244": 0.3, // 배민상회
  "29297": 0.3, // 오늘의집
  "5438": 0.3, // 우체국쇼핑
  "20883": 0.2, // 쇼핑엔티
  "6547": 0.3, // 롯데백화점
  "46826": 0.2, // 어바웃펫
};

const MALL_IDS_WEIGHTED = MALLS.filter((m) => (MALL_WEIGHT[m.id] ?? 0) > 0);

const PRODUCT_POPULARITY: Record<string, number> = PRODUCTS.reduce(
  (acc, p, i) => {
    acc[p.id] = 0.4 + ((i * 7) % 13) / 10;
    return acc;
  },
  {} as Record<string, number>,
);

function topCategoryCode(categoryCode: string): string {
  return categoryCode.slice(0, 2);
}

function generateSales(): Sale[] {
  const sales: Sale[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let salesIdx = 0;

  for (let d = 0; d < DAYS_OF_HISTORY; d += 1) {
    const date = subDays(today, d);
    const iso = format(date, "yyyy-MM-dd");
    const dayOfWeek = date.getDay();
    const weekendBoost = dayOfWeek === 0 || dayOfWeek === 6 ? 1.25 : 1.0;
    const dayOfYear = Math.floor(
      (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const seasonal = 1 + 0.15 * Math.sin((dayOfYear / 365) * 2 * Math.PI);
    const growthFactor = 1 + (DAYS_OF_HISTORY - d) / DAYS_OF_HISTORY / 6;

    for (const site of SITES) {
      const eventCount = int(28, 55);
      for (let i = 0; i < eventCount; i += 1) {
        const product = pick(PRODUCTS);
        const top = topCategoryCode(product.categoryCode);
        const catWeight = SITE_CATEGORY_WEIGHT[site.id][top] ?? 1;
        if (rand() > catWeight * 0.65) continue;

        const popularity = PRODUCT_POPULARITY[product.id];
        if (rand() > popularity * 0.85) continue;

        const mall = pick(MALL_IDS_WEIGHTED);
        const mallWeight = MALL_WEIGHT[mall.id] ?? 0.5;
        if (rand() > mallWeight / 2.0) continue;

        const quantity = int(1, 4);
        const unitJitter = 0.92 + rand() * 0.16;
        const gross = Math.round(
          product.basePrice *
            quantity *
            unitJitter *
            weekendBoost *
            seasonal *
            growthFactor,
        );
        const commission = Math.round(gross * mall.commissionRate);

        salesIdx += 1;
        sales.push({
          id: `S${salesIdx.toString().padStart(7, "0")}`,
          date: iso,
          siteId: site.id,
          productId: product.id,
          mallId: mall.id,
          quantity,
          grossAmount: gross,
          commission,
        });
      }
    }
  }
  return sales;
}

let _sales: Sale[] | null = null;
export function getMockSales(): Sale[] {
  if (!_sales) _sales = generateSales();
  return _sales;
}

export function getMockProducts(): Product[] {
  return PRODUCTS;
}

export { CATEGORIES };
