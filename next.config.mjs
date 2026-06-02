/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 런타임(서버리스 함수)에는 빌드 때 생성한 JSON 캐시 + 월별 목표 파일만 넣는다.
    // GMV 원본 엑셀(.xls)은 캐시 생성에만 쓰이고 런타임엔 불필요해서 번들에서 제외
    // (250MB 함수 크기 한도 초과 방지). 단, 목표 파일은 캐시에 안 들어가서 런타임에도
    // 직접 읽으므로 명시적으로 포함시킨다.
    outputFileTracingIncludes: {
      "/**": [
        "./data/.cache/parsed.json",
        "./data/에누리/*타겟*",
        "./data/에누리/*target*",
        "./data/에누리/*목표*",
      ],
    },
    outputFileTracingExcludes: {
      "/**": ["./data/에누리/*GMV_RAWDATA*", "./data/sample/**"],
    },
  },
};

export default nextConfig;
