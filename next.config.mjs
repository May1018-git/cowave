/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Vercel 서버리스 함수 번들에 data/ 폴더 포함 (Next.js 14 방식)
    outputFileTracingIncludes: {
      "/**": ["./data/**/*"],
    },
  },
};

export default nextConfig;
