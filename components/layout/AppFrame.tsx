"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * 로그인 페이지(/login)에서는 사이드바·헤더 없이 children 만 전체화면으로,
 * 그 외에는 대시보드 레이아웃(사이드바+헤더)을 보여준다.
 */
export function AppFrame({
  sidebar,
  header,
  children,
}: {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      {sidebar}
      <div className="flex flex-1 flex-col">
        {header}
        <main className="flex-1 p-3 md:p-6">{children}</main>
      </div>
    </div>
  );
}
