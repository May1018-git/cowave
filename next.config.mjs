/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // 런타임(서버리스 함수)에는 빌드 때 생성한 JSON 캐시만 넣는다.
    // 원본 엑셀(.xls)은 빌드 시 캐시 생성에만 쓰이고 런타임엔 불필요해서
    // 번들에서 제외 → 250MB 함수 크기 한도 초과 방지.
    outputFileTracingIncludes: {
      "/**": ["./data/.cache/parsed.json"],
    },
    outputFileTracingExcludes: {
      "/**": ["./data/에누리/**", "./data/sample/**"],
    },
  },
};

export default nextConfig;
