import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn, formatKRW, formatNumber, formatPercent } from "@/lib/utils";
import type { DailyRow } from "@/lib/data-source";

interface DailySalesTableProps {
  rows: DailyRow[];
}

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"] as const;

function weekdayOf(date: string): number {
  // "yyyy-MM-dd" 를 로컬 타임존 영향 없이 파싱 (UTC 기준 요일 계산).
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function GrowthCell({ percent }: { percent: number | null }) {
  const p = percent;
  const positive = (p ?? 0) > 0.05;
  const negative = (p ?? 0) < -0.05;
  const Icon = positive ? ArrowUp : negative ? ArrowDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 tabular-nums text-xs font-medium",
        positive && "text-emerald-700",
        negative && "text-red-700",
        !positive && !negative && "text-gray-500",
      )}
    >
      <Icon size={11} />
      {formatPercent(p)}
    </span>
  );
}

export function DailySalesTable({ rows }: DailySalesTableProps) {
  // 최신 날짜가 위로 오도록. 차트는 시간순(왼→오른쪽)이 자연스럽고,
  // 표는 "오늘 것부터" 훑어보는 용도라 방향이 반대다.
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="table-scroll">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-gray-500">
            <th className="py-2 pl-2 font-medium">일자</th>
            <th className="py-2 font-medium">요일</th>
            <th className="py-2 text-right font-medium">매출</th>
            <th className="py-2 text-right font-medium">주문수</th>
            <th className="py-2 text-right font-medium">객단가</th>
            <th className="py-2 text-right font-medium">수량</th>
            <th className="py-2 pr-2 text-right font-medium">YoY</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const wd = weekdayOf(r.date);
            const weekend = wd === 0 || wd === 6;
            return (
              <tr
                key={r.date}
                className={cn(
                  "border-b last:border-b-0",
                  weekend && "bg-gray-50/70",
                )}
              >
                <td className="py-2 pl-2 tabular-nums font-medium">{r.date}</td>
                <td
                  className={cn(
                    "py-2 text-xs",
                    wd === 0 && "text-red-500",
                    wd === 6 && "text-blue-500",
                    wd !== 0 && wd !== 6 && "text-gray-500",
                  )}
                >
                  {WEEKDAY[wd]}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatKRW(r.grossAmount)}
                </td>
                <td className="py-2 text-right tabular-nums text-gray-600">
                  {formatNumber(r.orders)}
                </td>
                <td className="py-2 text-right tabular-nums text-gray-600">
                  {r.averageOrderValue > 0 ? formatKRW(r.averageOrderValue) : "—"}
                </td>
                <td className="py-2 text-right tabular-nums text-gray-600">
                  {formatNumber(r.quantity)}
                </td>
                <td className="py-2 pr-2 text-right">
                  <GrowthCell percent={r.growth.yoy.percent} />
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="py-8 text-center text-sm text-gray-400">
                데이터가 없습니다
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
