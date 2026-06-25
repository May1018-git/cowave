"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * 상품명 검색 입력. 250ms 디바운스 후 URL 의 `q` 파라미터를 갱신해
 * 서버 컴포넌트가 새 결과로 다시 렌더되게 한다.
 */
export function ProductsSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [value, setValue] = useState(initial);

  // URL 의 q 가 바깥에서 바뀌면(예: 카테고리 변경 시 보존) input 동기화
  useEffect(() => {
    setValue(initial);
  }, [initial]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const cur = params.get("q") ?? "";
      if (cur === value) return;
      const p = new URLSearchParams(params.toString());
      if (value.trim()) p.set("q", value.trim());
      else p.delete("q");
      // 검색어 바뀌면 페이지네이션 리셋
      p.delete("all");
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full sm:w-72">
      <Search
        size={14}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="상품명 검색"
        className="w-full rounded-md border bg-white py-1.5 pl-8 pr-8 text-sm focus:border-blue-500 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
          aria-label="검색어 지우기"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
