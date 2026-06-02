import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AppFrame } from "@/components/layout/AppFrame";

export const metadata: Metadata = {
  title: "식품 카테고리 대시보드",
  description: "에누리 매출 및 카탈로그 통합 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">
        <AppFrame
          sidebar={
            <Suspense fallback={<aside className="hidden w-56 shrink-0 border-r bg-white md:block" />}>
              <Sidebar />
            </Suspense>
          }
          header={
            <Suspense fallback={<div className="h-14 border-b bg-white" />}>
              <Header />
            </Suspense>
          }
        >
          <Suspense fallback={<div>로딩 중...</div>}>{children}</Suspense>
        </AppFrame>
      </body>
    </html>
  );
}
