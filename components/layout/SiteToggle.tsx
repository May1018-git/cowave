"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { SITES } from "@/lib/sites";
import type { SiteFilter } from "@/lib/types";

const SITE_COLOR_CLASS: Record<string, string> = {
  enuri: "bg-brand-enuri",
  danawa: "bg-brand-danawa",
};

const OPTIONS: { value: SiteFilter; label: string; color: string }[] = [
  { value: "all", label: "전체", color: "bg-gray-900" },
  ...SITES.map((s) => ({
    value: s.id as SiteFilter,
    label: s.name,
    color: SITE_COLOR_CLASS[s.id] ?? "bg-gray-500",
  })),
];

export function SiteToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("site") as SiteFilter) ?? "all";

  if (SITES.length <= 1) return null;

  function setSite(value: SiteFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("site");
    else params.set("site", value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex items-center gap-1 rounded-full border bg-gray-50 p-1">
      {OPTIONS.map((opt) => {
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSite(opt.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-800",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", opt.color)} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
