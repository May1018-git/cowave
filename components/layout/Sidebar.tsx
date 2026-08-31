"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { ExternalLinks } from "./ExternalLinks";

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  return (
    <aside className="hidden w-56 shrink-0 border-r bg-white md:flex md:flex-col">
      <div className="flex h-14 items-center border-b px-5">
        <span className="text-lg font-bold tracking-tight">Cowave</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const href = qs ? `${item.href}?${qs}` : item.href;
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <ExternalLinks />
      <div className="border-t p-4 text-xs text-gray-400">
        © {new Date().getFullYear()} Cowave
      </div>
    </aside>
  );
}
