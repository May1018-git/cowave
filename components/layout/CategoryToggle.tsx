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
  // data-source 의 matchesCategoryPrefix 가 이미 쉼표구분 다중 코드를 지원하므로
  // (하나라도 prefix 일치하면 포함), UI 쪽만 라디오 → 다중 토글로 바꾸면 된다.
  const selected = new Set(current ? current.split(",") : []);

  // 멤버 코드가 모두 데이터에 존재하는 그룹만 노출
  const available = new Set(options.map((o) => o.code));
  const groups = CATEGORY_GROUPS.filter((g) =>
    g.codes.every((c) => available.has(c)),
  ).map((g) => ({ value: g.codes.join(","), name: g.name }));

  if (options.length <= 1 && groups.length === 0) return null;

  function applySelection(next: Set<string>) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.size === 0) params.delete("cat");
    else params.set("cat", [...next].join(","));
    // 카테고리 선택 변경 시 드릴다운 필터는 초기화 (스코프 밖일 수 있음)
    params.delete("cat1");
    params.delete("cat2");
    params.delete("cat3");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  // value 가 그룹이면("1501,1506") 멤버 코드 전체를 한 번에 토글
  function toggleValue(value: string) {
    const codes = value.split(",");
    const allSelected = codes.every((c) => selected.has(c));
    const next = new Set(selected);
    for (const c of codes) {
      if (allSelected) next.delete(c);
      else next.add(c);
    }
    applySelection(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-full border bg-gray-50 p-1">
      <button
        type="button"
        onClick={() => applySelection(new Set())}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-medium transition-colors",
          selected.size === 0
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-800",
        )}
      >
        전체
      </button>
      {groups.map((g) => {
        const codes = g.value.split(",");
        const active = codes.every((c) => selected.has(c));
        return (
          <button
            key={g.value}
            type="button"
            onClick={() => toggleValue(g.value)}
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
        const active = selected.has(opt.code);
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => toggleValue(opt.code)}
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
