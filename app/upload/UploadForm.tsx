"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import {
  Upload as UploadIcon,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  validateUploadFilename,
  checkFileSizeWarning,
} from "@/lib/upload-validation";
import { EXTERNAL_LINKS } from "@/lib/nav";

const GMV_RAW_DATA_LINK = EXTERNAL_LINKS.find((l) => l.href.includes("OrderData_Raw"))!;

type Status = "pending" | "uploading" | "committing" | "done" | "error" | "rejected";
interface FileEntry {
  file: File;
  status: Status;
  message?: string;
  /** 업로드는 통과시키되 표시할 주의 사항 (예: 행 한도 절단 의심) */
  warning?: string;
}

interface UploadFormProps {
  cacheSizeMB: number | null;
}

export function UploadForm({ cacheSizeMB }: UploadFormProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setEntries((prev) => [
      ...prev,
      ...arr.map((file) => {
        const err = validateUploadFilename(file.name);
        if (err) {
          return { file, status: "rejected" as Status, message: err.message };
        }
        const warn = checkFileSizeWarning(file.size);
        return {
          file,
          status: "pending" as Status,
          warning: warn?.message,
        };
      }),
    ]);
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  function clearDone() {
    setEntries((prev) => prev.filter((e) => e.status !== "done"));
  }

  function updateEntry(idx: number, patch: Partial<FileEntry>) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)),
    );
  }

  async function uploadOne(idx: number, file: File): Promise<void> {
    updateEntry(idx, { status: "uploading", message: "업로드 중..." });
    let blobUrl: string;
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload-token",
      });
      blobUrl = blob.url;
    } catch (e) {
      updateEntry(idx, {
        status: "error",
        message: `업로드 실패: ${(e as Error).message}`,
      });
      return;
    }

    updateEntry(idx, { status: "committing", message: "GitHub 커밋 중..." });
    try {
      const res = await fetch("/api/upload-commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blobUrl, filename: file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const sizeMB = (data.sizeBytes / 1024 / 1024).toFixed(1);
      updateEntry(idx, {
        status: "done",
        message: data.overwrote
          ? `덮어쓰기 완료 (${sizeMB}MB) — 2-3분 후 대시보드 반영`
          : `완료 (${sizeMB}MB) — 2-3분 후 대시보드 반영`,
      });
    } catch (e) {
      updateEntry(idx, {
        status: "error",
        message: `커밋 실패: ${(e as Error).message}`,
      });
    }
  }

  async function uploadAll() {
    setRunning(true);
    // 최신 entries snapshot 으로 진행 (state 갱신은 인덱스 기반이라 안전)
    const pendingIdxs = entries
      .map((e, i) => (e.status === "pending" ? i : -1))
      .filter((i) => i >= 0);
    for (const i of pendingIdxs) {
      await uploadOne(i, entries[i].file);
    }
    setRunning(false);
  }

  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const doneCount = entries.filter((e) => e.status === "done").length;
  const rejectedCount = entries.filter((e) => e.status === "rejected").length;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-gray-900">데이터 업로드</h1>
          <a
            href={GMV_RAW_DATA_LINK.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            <ExternalLink size={13} />
            {GMV_RAW_DATA_LINK.label}
          </a>
        </div>
        <p className="text-sm text-gray-500">
          새로 받은 매출 xls 파일을 여기에 올리면 대시보드에 자동 반영됩니다.
          (업로드 후 약 2-3분 소요)
        </p>
      </header>

      <UsageBanner sizeMB={cacheSizeMB} />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors cursor-pointer",
          dragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:bg-gray-100",
        )}
      >
        <UploadIcon size={32} className="text-gray-400" />
        <p className="text-sm font-medium text-gray-700">
          xls / xlsx 파일을 끌어다 놓거나 클릭해서 선택
        </p>
        <p className="text-xs text-gray-500">여러 개 동시 선택 가능</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xls,.xlsx"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {entries.length > 0 && (
        <div className="rounded-lg border bg-white">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <div className="text-sm font-medium text-gray-700">
              파일 {entries.length}개
              {pendingCount > 0 && (
                <span className="ml-2 text-xs text-gray-500">
                  (대기 {pendingCount}개)
                </span>
              )}
              {rejectedCount > 0 && (
                <span className="ml-2 text-xs text-red-600">
                  · 거부 {rejectedCount}개
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {doneCount > 0 && (
                <button
                  type="button"
                  onClick={clearDone}
                  disabled={running}
                  className="rounded-md border px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  완료된 항목 지우기
                </button>
              )}
              <button
                type="button"
                onClick={uploadAll}
                disabled={running || pendingCount === 0}
                className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {running ? "업로드 중..." : `업로드 시작 (${pendingCount}개)`}
              </button>
            </div>
          </div>
          <ul className="divide-y">
            {entries.map((e, i) => (
              <li
                key={`${e.file.name}-${i}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-2",
                  e.status === "rejected" && "bg-red-50",
                  e.status === "pending" && e.warning && "bg-amber-50",
                )}
              >
                <FileSpreadsheet
                  size={16}
                  className={cn(
                    "shrink-0",
                    e.status === "rejected"
                      ? "text-red-500"
                      : "text-emerald-600",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "truncate text-sm",
                      e.status === "rejected"
                        ? "text-red-800"
                        : "text-gray-800",
                    )}
                  >
                    {e.file.name}
                  </div>
                  <div
                    className={cn(
                      "text-xs",
                      e.status === "rejected"
                        ? "text-red-600"
                        : e.warning && e.status === "pending"
                          ? "text-amber-700"
                          : "text-gray-500",
                    )}
                  >
                    {(e.file.size / 1024 / 1024).toFixed(1)}MB
                    {e.message ? ` · ${e.message}` : ""}
                    {e.warning && !e.message ? ` · ${e.warning}` : ""}
                  </div>
                </div>
                <StatusIcon status={e.status} />
                {(e.status === "pending" || e.status === "rejected") &&
                  !running && (
                    <button
                      type="button"
                      onClick={() => removeEntry(i)}
                      className="text-gray-400 hover:text-gray-700"
                      aria-label="제거"
                    >
                      <X size={16} />
                    </button>
                  )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-400">
        임시 파일(<code>~$</code> 로 시작)·요약본·복사본은 자동으로 거부됩니다.
        같은 이름으로 올리면 기존 파일을 덮어씁니다.
      </p>
    </div>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "done")
    return <CheckCircle2 size={16} className="text-emerald-600" />;
  if (status === "error" || status === "rejected")
    return <XCircle size={16} className="text-red-600" />;
  if (status === "uploading" || status === "committing")
    return <Loader2 size={16} className="animate-spin text-blue-600" />;
  return <span className="h-4 w-4" />;
}

/**
 * 데이터 캐시 크기 기반 자가 경고 배너.
 * 100MB 미만이면 표시 안 함 — 충분히 여유 있을 때 화면을 어지럽히지 않기 위함.
 * Vercel 서버리스 함수 번들 한도가 250MB 이므로 그쪽에 가까워질수록 강한 경고.
 */
function UsageBanner({ sizeMB }: { sizeMB: number | null }) {
  if (sizeMB === null || sizeMB < 100) return null;
  const danger = sizeMB >= 200;
  const display = sizeMB.toFixed(0);
  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-xs",
        danger
          ? "border-red-300 bg-red-50 text-red-900"
          : "border-yellow-300 bg-yellow-50 text-yellow-900",
      )}
    >
      <p className="font-semibold">
        {danger ? "⚠ 데이터 용량 관리 필요" : "데이터 용량 관찰 시작"} ·
        현재 캐시 {display}MB / 한도 250MB
      </p>
      <p className="mt-0.5 leading-relaxed">
        {danger
          ? "Vercel 배포 한도(250MB)에 근접했습니다. 오래된 월 데이터 파일을 GitHub 저장소에서 정리해야 빌드 실패를 피할 수 있어요. 도움이 필요하면 담당자에게 알려주세요."
          : "데이터가 꾸준히 쌓이고 있어요. 200MB 넘기 전에 오래된 파일 정리를 검토하면 좋습니다."}
      </p>
    </div>
  );
}
