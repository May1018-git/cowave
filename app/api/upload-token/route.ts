/**
 * Vercel Blob 클라이언트 업로드용 토큰 발급 엔드포인트.
 *
 * 두 종류의 요청을 같은 URL 로 받는다:
 *  1) `blob.generate-client-token` — 브라우저가 업로드 직전 토큰 요청
 *     → 우리가 인증 쿠키를 직접 확인
 *  2) `blob.upload-completed` — Vercel Blob 인프라가 업로드 완료 후 webhook 호출
 *     → @vercel/blob 라이브러리가 서명된 페이로드를 자체 검증
 *
 * 그래서 이 엔드포인트는 미들웨어 비밀번호 게이트에서 제외되어 있다.
 * (보안: handleUpload 가 webhook 서명을, onBeforeGenerateToken 콜백이 쿠키를 검증)
 */
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_TOKEN } from "@/lib/auth";

function isAuthenticated(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie") || "";
  return cookieHeader.split(";").some((c) => {
    const [k, v] = c.trim().split("=");
    return k === AUTH_COOKIE && v === AUTH_TOKEN;
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!isAuthenticated(request)) {
          throw new Error("로그인이 필요합니다.");
        }
        return {
          allowedContentTypes: [
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/octet-stream",
          ],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async () => {
        // 실제 GitHub 커밋은 클라이언트가 /api/upload-commit 으로 호출해 처리한다.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
