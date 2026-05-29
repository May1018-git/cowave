import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, AUTH_TOKEN } from "@/lib/auth";

export function middleware(req: NextRequest) {
  if (req.cookies.get(AUTH_COOKIE)?.value === AUTH_TOKEN) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // 로그인 페이지·인증 API·정적자원 외 전부 보호
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico).*)"],
};
