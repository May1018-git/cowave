"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface LoadMoreToggleProps {
  showingAll: boolean;
  totalCount: number;
  topCount: number;
}

/**
 * "더 보기 (전체 N개)" ↔ "TOP N만 보기" 토글.
 * URL 의 `all=1` 파라미터를 켜고/끄는 것으로 서버 컴포넌트가 다시 렌더된다.
 */
export function LoadMoreToggle({
  showingAll,
  totalCount,
  topCount,
}: LoadMoreToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (totalCount <= topCount) return null;

  function toggle() {
    const p = new URLSearchParams(params.toString());
    if (showingAll) p.delete("all");
    else p.set("all", "1");
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex justify-center pt-4">
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-1.5 rounded-md border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {showingAll ? (
          <>
            <ChevronUp size={14} />
            TOP {topCount}만 보기
          </>
        ) : (
          <>
            <ChevronDown size={14} />
            더 보기 (전체 {totalCount.toLocaleString()}개)
          </>
        )}
      </button>
    </div>
  );
}
