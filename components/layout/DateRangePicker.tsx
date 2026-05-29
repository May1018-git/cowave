"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  function pushParams(nextFrom: string, nextTo: string) {
    if (nextFrom === from && nextTo === to) return; // 변화 없으면 navigation 생략
    const params = new URLSearchParams(searchParams.toString());
    if (nextFrom) params.set("from", nextFrom);
    else params.delete("from");
    if (nextTo) params.set("to", nextTo);
    else params.delete("to");
    const qs = params.toString();
    // replace + transition: 히스토리 누적 방지 + 입력이 멈추지 않도록 비차단 전환
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function setRange(start: Date, end: Date) {
    pushParams(format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd"));
  }

  function thisMonth() {
    const t = new Date();
    setRange(startOfMonth(t), endOfMonth(t));
  }

  function lastMonth() {
    const t = subMonths(new Date(), 1);
    setRange(startOfMonth(t), endOfMonth(t));
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 transition-opacity",
        isPending && "opacity-60",
      )}
    >
      <input
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => pushParams(e.target.value, to)}
        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
      />
      <span className="text-xs text-gray-400">~</span>
      <input
        type="date"
        value={to}
        min={from || undefined}
        onChange={(e) => pushParams(from, e.target.value)}
        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
      />
      <button
        type="button"
        onClick={thisMonth}
        className="rounded-full border bg-white px-2.5 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
      >
        이번 달
      </button>
      <button
        type="button"
        onClick={lastMonth}
        className="rounded-full border bg-white px-2.5 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
      >
        지난 달
      </button>
      {(from || to) && (
        <button
          type="button"
          onClick={() => pushParams("", "")}
          className="rounded-full px-2 py-1 text-[11px] text-gray-400 hover:text-gray-700"
        >
          초기화
        </button>
      )}
    </div>
  );
}
