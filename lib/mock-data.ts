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

const PRODUCT_TEMPLATES: { categoryCode: string; names: string[]; priceRange: [number, number] }[] = [
  {
    categoryCode: "151101",
    names: ["진라면 매운맛 5입", "신라면 5입", "안성탕면 5입", "너구리 5입"],
    priceRange: [3500, 6500],
  },
  {
    categoryCode: "151102",
    names: ["신라면 컵 6입", "왕뚜껑 6입", "육개장 컵라면 6입"],
    priceRange: [5000, 8500],
  },
  {
    categoryCode: "151103",
    names: ["햇반 12입", "오뚜기밥 12입", "현미밥 8입"],
    priceRange: [9900, 16500],
  },
  {
    categoryCode: "151201",
    names: ["참치캔 200g x4", "스팸 클래식 200g x3", "꽁치통조림 400g"],
    priceRange: [6500, 13500],
  },
  {
    categoryCode: "151202",
    names: ["새우깡 6입", "포카칩 오리지널 6입", "초코파이 12입"],
    priceRange: [4500, 9500],
  },
  {
    categoryCode: "201101",
    names: ["삼성 전자레인지 23L", "LG 전자레인지 32L"],
    priceRange: [89000, 220000],
  },
  {
    categoryCode: "201102",
    names: ["테팔 에어프라이어 5.5L", "필립스 에어프라이어 XXL", "쿠쿠 에어프라이어 7L"],
    priceRange: [129000, 320000],
  },
  {
    categoryCode: "201201",
    names: ["삼성 50인치 4K UHD", "LG 55인치 OLED", "삼성 65인치 QLED"],
    priceRange: [490000, 2900000],
  },
  {
    categoryCode: "301101",
    names: ["베이직 반팔티", "오버핏 반팔티", "프린팅 티셔츠"],
    priceRange: [9900, 39000],
  },
  {
    categoryCode: "301201",
    names: ["플라워 원피스", "린넨 롱원피스", "셔츠 원피스"],
    priceRange: [29000, 89000],
  },
  {
    categoryCode: "401101",
    names: ["ASUS ROG 게이밍 노트북", "MSI Katana 17", "레노버 LOQ"],
    priceRange: [1290000, 2890000],
  },
  {
    categoryCode: "401102",
    names: ["LG 그램 16", "삼성 갤럭시북 4", "ASUS Vivobook"],
    priceRange: [890000, 2390000],
  },
  {
    categoryCode: "401201",
    names: ["로지텍 MX Keys", "한성 GK888", "키크론 K2"],
    priceRange: [49000, 190000],
  },
  {
    categoryCode: "401202",
    names: ["로지텍 MX Master 3S", "MX Anywhere 3", "G PRO X SUPERLIGHT"],
    priceRange: [59000, 169000],
  },
  {
    categoryCode: "501101",
    names: ["바이오던스 토너 패드", "닥터지 토너", "라운드랩 1025 토너"],
    priceRange: [12900, 32000],
  },
];

function buildProducts(): Product[] {
  const products: Product[] = [];
  let idx = 0;
  for (const tpl of PRODUCT_TEMPLATES) {
    for (const name of tpl.names) {
      idx += 1;
      products.push({
        id: `P${idx.toString().padStart(4, "0")}`,
        name,
        categoryCode: tpl.categoryCode,
        basePrice: int(tpl.priceRange[0], tpl.priceRange[1]),
      });
    }
  }
  return products;
}

const PRODUCTS = buildProducts();

const SITE_CATEGORY_WEIGHT: Record<SiteId, Record<string, number>> = {
  enuri: { "15": 1.4, "20": 1.0, "30": 0.9, "40": 0.7, "50": 1.1 },
  danawa: { "15": 0.4, "20": 1.3, "30": 0.5, "40": 2.0, "50": 0.4 },
};

const MALL_WEIGHT: Record<MallId, number> = {
  naver: 1.3,
  coupang: 1.5,
  "11st": 0.9,
  gmarket: 0.8,
  auction: 0.6,
  own: 0.5,
};

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

        const mall = pick(MALLS);
        if (rand() > MALL_WEIGHT[mall.id] / 1.5) continue;

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
