"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getChildren } from "@/lib/category-map";

export function CategoryFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const top = params.get("cat1") ?? "";
  const mid = params.get("cat2") ?? "";
  const leaf = params.get("cat3") ?? "";

  const tops = getChildren(null);
  const mids = top ? getChildren(top) : [];
  const leaves = mid ? getChildren(mid) : [];

  function set(level: "cat1" | "cat2" | "cat3", value: string) {
    const p = new URLSearchParams(params.toString());
    if (!value) p.delete(level);
    else p.set(level, value);
    if (level === "cat1") {
      p.delete("cat2");
      p.delete("cat3");
    }
    if (level === "cat2") p.delete("cat3");
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="rounded-md border bg-white px-2 py-1.5 text-sm"
        value={top}
        onChange={(e) => set("cat1", e.target.value)}
      >
        <option value="">대분류 전체</option>
        {tops.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        className="rounded-md border bg-white px-2 py-1.5 text-sm disabled:bg-gray-50 disabled:text-gray-400"
        value={mid}
        onChange={(e) => set("cat2", e.target.value)}
        disabled={!top}
      >
        <option value="">중분류 전체</option>
        {mids.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        className="rounded-md border bg-white px-2 py-1.5 text-sm disabled:bg-gray-50 disabled:text-gray-400"
        value={leaf}
        onChange={(e) => set("cat3", e.target.value)}
        disabled={!mid}
      >
        <option value="">소분류 전체</option>
        {leaves.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
