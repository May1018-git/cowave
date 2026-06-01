/**
 * Vercel Blob 에 올라간 임시 파일을 받아 GitHub 에 커밋하고 Blob 을 삭제한다.
 * 클라이언트가 upload() 로 Blob 업로드 끝낸 직후 호출.
 */
import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { commitFileToGitHub } from "@/lib/github";
import { validateUploadFilename } from "@/lib/upload-validation";

export const maxDuration = 60;

interface CommitRequest {
  blobUrl: string;
  filename: string;
}

export async function POST(req: Request) {
  let body: CommitRequest;
  try {
    body = (await req.json()) as CommitRequest;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }
  const { blobUrl, filename } = body;
  if (!blobUrl || !filename) {
    return NextResponse.json(
      { error: "blobUrl, filename 둘 다 필요합니다." },
      { status: 400 },
    );
  }

  // 파일명 검증 — 경로 탈출 + GMV 규칙
  const vErr = validateUploadFilename(filename);
  if (vErr) {
    return NextResponse.json({ error: vErr.message }, { status: 400 });
  }

  // Blob URL 검증 — Vercel Blob 도메인만 허용
  let parsed: URL;
  try {
    parsed = new URL(blobUrl);
  } catch {
    return NextResponse.json({ error: "잘못된 blobUrl" }, { status: 400 });
  }
  if (!parsed.hostname.endsWith(".public.blob.vercel-storage.com")) {
    return NextResponse.json(
      { error: "허용되지 않은 blob 도메인" },
      { status: 400 },
    );
  }

  // Blob 다운로드
  const blobRes = await fetch(blobUrl);
  if (!blobRes.ok) {
    return NextResponse.json(
      { error: `Blob fetch 실패: ${blobRes.status}` },
      { status: 500 },
    );
  }
  const arrayBuf = await blobRes.arrayBuffer();
  const content = Buffer.from(arrayBuf);

  // GitHub 커밋
  let result;
  try {
    result = await commitFileToGitHub({
      path: `data/에누리/${filename}`,
      content,
      message: `data: ${filename} ${content.length > 0 ? `(${(content.length / 1024 / 1024).toFixed(1)}MB)` : ""} 업로드`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }

  // 임시 Blob 정리 (실패해도 무시 — 30일 후 자동 삭제됨)
  try {
    await del(blobUrl);
  } catch {
    // ignore
  }

  return NextResponse.json({
    ok: true,
    filename,
    sizeBytes: content.length,
    overwrote: result.overwrote,
    commitSha: result.commitSha,
    commitUrl: result.htmlUrl,
  });
}
