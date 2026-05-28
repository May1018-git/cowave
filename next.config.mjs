/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel 서버리스 함수 번들에 data/ 폴더 파일들 포함시키기.
  // 기본 추적은 import 된 파일만 포함하므로, 런타임에 readFileSync 하는
  // xls 파일들은 명시적으로 지정해야 함.
  outputFileTracingIncludes: {
    "/**/*": ["./data/**/*"],
  },
};

export default nextConfig;
