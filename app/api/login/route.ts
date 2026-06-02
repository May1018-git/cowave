import { NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_TOKEN, expectedPassword } from "@/lib/auth";

export async function POST(req: Request) {
  let password = "";
  try {
    const body = await req.json();
    if (typeof body?.password === "string") password = body.password;
  } catch {
    password = "";
  }

  if (password !== expectedPassword()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, AUTH_TOKEN, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // maxAge 미설정 → 세션 쿠키: 브라우저 닫으면 자동 만료
  });
  return res;
}
