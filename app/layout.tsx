import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Cowave 대시보드",
  description: "에누리·다나와 매출 및 카탈로그 통합 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">
        <div className="flex min-h-screen">
          <Suspense fallback={<aside className="hidden w-56 shrink-0 border-r bg-white md:block" />}>
            <Sidebar />
          </Suspense>
          <div className="flex flex-1 flex-col">
            <Suspense fallback={<div className="h-14 border-b bg-white" />}>
              <Header />
            </Suspense>
            <main className="flex-1 p-6">
              <Suspense fallback={<div>로딩 중...</div>}>{children}</Suspense>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
