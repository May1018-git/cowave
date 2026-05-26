# Cowave 대시보드

에누리/다나와 가격비교 사이트의 **매출 및 카탈로그 운영 대시보드**.

- 매출 추이 (일/주/월)
- 쇼핑몰별 비교
- 인기 상품 랭킹 (YoY/MoM 증감률)
- 상단 사이트 토글: 전체 / 에누리 / 다나와

## 시작하기

```bash
pnpm install
pnpm dev
# http://localhost:3000
```

## 실제 데이터 연결 (운영 PC에서)

1. `.env.example` 을 복사해 `.env.local` 생성
2. `DATA_DIR` 에 OneDrive 폴더 경로 지정 (예: `C:\Users\enuri\OneDrive\Desktop\Cowave_dashboard`)
3. 해당 폴더 아래 `에누리/`, `다나와/` 서브폴더에 `.xlsx` 파일들을 적재
4. 파일명 규칙: `{카테고리명}({카테고리코드})GMV_RAWDATA_{시작일}_{종료일}.xlsx`
5. `pnpm dev` 또는 `pnpm build && pnpm start`

`DATA_DIR` 이 비어 있으면 자동으로 `lib/mock-data.ts` 의 더미 데이터를 사용합니다.

## 디렉토리 구조

```
app/                # Next.js App Router 페이지
components/         # UI 컴포넌트 (layout / dashboard / sales / malls / products)
lib/
  types.ts          # 도메인 타입
  category-map.ts   # 카테고리 코드 → 이름 매핑 (계층)
  mall-map.ts       # 쇼핑몰 코드 → 이름 매핑
  mock-data.ts      # 더미 데이터 (~13개월)
  data-source.ts    # 통합 조회 API (모든 페이지가 이 파일만 사용)
  growth.ts         # YoY/MoM 증감률 계산
  loaders/
    filename.ts     # 파일명 패턴 파서
    xlsx.ts         # Excel → Sale 정규화
```

## 다음 단계 (사용자 제공 자료 필요)

- 카테고리 코드 매핑 (계층) → `lib/category-map.ts`
- 쇼핑몰 코드 매핑 → `lib/mall-map.ts`
- Excel 컬럼 헤더 (또는 샘플 파일) → `lib/loaders/xlsx.ts`
