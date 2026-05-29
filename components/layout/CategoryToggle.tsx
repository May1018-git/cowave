"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CATEGORY_GROUPS } from "@/lib/category-map";
import { cn } from "@/lib/utils";

interface CategoryToggleProps {
  options: { code: string; name: string }[];
}

export function CategoryToggle({ options }: CategoryToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("cat") ?? "";

  // 멤버 코드가 모두 데이터에 존재하는 그룹만 노출
  const available = new Set(options.map((o) => o.code));
  const groups = CATEGORY_GROUPS.filter((g) =>
    g.codes.every((c) => available.has(c)),
  ).map((g) => ({ value: g.codes.join(","), name: g.name }));

  if (options.length <= 1 && groups.length === 0) return null;

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
      {groups.map((g) => {
        const active = current === g.value;
        return (
          <button
            key={g.value}
            type="button"
            onClick={() => setCat(g.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              active
                ? "bg-white text-blue-700 shadow-sm"
                : "text-blue-600 hover:text-blue-800",
            )}
          >
            {g.name}
          </button>
        );
      })}
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
