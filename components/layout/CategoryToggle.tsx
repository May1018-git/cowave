"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface CategoryToggleProps {
  options: { code: string; name: string }[];
}

export function CategoryToggle({ options }: CategoryToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("cat") ?? "";

  if (options.length <= 1) return null;

  function setCat(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete("cat");
    else params.set("cat", value);
    // 카테고리 토글 변경 시 드릴다운 필터는 초기화 (스코프 밖일 수 있음)
    params.delete("cat1");
    params.delete("cat2");
    params.delete("cat3");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex items-center gap-1 rounded-full border bg-gray-50 p-1">
      <button
        type="button"
        onClick={() => setCat("")}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-medium transition-colors",
          current === ""
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-800",
        )}
      >
        전체
      </button>
      {options.map((opt) => {
        const active = current === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => setCat(opt.code)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-800",
            )}
          >
            {opt.name}
          </button>
        );
      })}
    </div>
  );
}
