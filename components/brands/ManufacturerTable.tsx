import Link from "next/link";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn, formatKRW, formatNumber, formatPercent } from "@/lib/utils";
import type { ManufacturerRow } from "@/lib/data-source";

interface ManufacturerTableProps {
  rows: ManufacturerRow[];
  qs?: string;
}

function formatDelta(delta: number): string {
  const sign = delta >= 0 ? "+" : "-";
  return `${sign}${formatKRW(Math.abs(delta), { compact: true })}원`;
}

function GrowthCell({ percent, delta }: { percent: number | null; delta: number }) {
  const p = percent;
  const positive = (p ?? 0) > 0.05;
  const negative = (p ?? 0) < -0.05;
  const Icon = positive ? ArrowUp : negative ? ArrowDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex flex-col items-end gap-0 tabular-nums text-xs font-medium",
        positive && "text-emerald-700",
        negative && "text-red-700",
        !positive && !negative && "text-gray-500",
      )}
    >
      <span className="inline-flex items-center gap-0.5">
        <Icon size={11} />
        {formatPercent(p)}
      </span>
      <span className="text-[10px] opacity-70">{formatDelta(delta)}</span>
    </span>
  );
}

export function ManufacturerTable({ rows, qs }: ManufacturerTableProps) {
  return (
    <div className="table-scroll">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs text-gray-500">
          <th className="py-2 pl-2 font-medium">#</th>
          <th className="py-2 font-medium">제조사</th>
          <th className="py-2 text-right font-medium">매출</th>
          <th className="py-2 text-right font-medium">주문수</th>
          <th className="py-2 text-right font-medium">객단가</th>
          <th className="py-2 text-right font-medium">YoY</th>
          <th className="py-2 pr-2 text-right font-medium">MoM</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.manufacturer} className="border-b last:border-b-0">
            <td className="py-2 pl-2 text-sm font-semibold text-gray-700">
              {i + 1}
            </td>
            <td className="py-2 font-medium">
              {r.manufacturer && r.manufacturer !== "기타" ? (
                <Link
                  href={`/brands/${encodeURIComponent(r.manufacturer)}${qs ? `?${qs}` : ""}`}
                  className="text-blue-600 hover:underline"
                >
                  {r.manufacturer}
                </Link>
              ) : (
                r.manufacturer
              )}
            </td>
            <td className="py-2 text-right tabular-nums">
              {formatKRW(r.grossAmount)}
            </td>
            <td className="py-2 text-right tabular-nums text-gray-600">
              {formatNumber(r.orders)}
            </td>
            <td className="py-2 text-right tabular-nums text-gray-600">
              {formatKRW(r.averageOrderValue)}원
            </td>
            <td className="py-2 text-right">
              <GrowthCell percent={r.growth.yoy.percent} delta={r.growth.yoy.delta} />
            </td>
            <td className="py-2 pr-2 text-right">
              <GrowthCell percent={r.growth.mom.percent} delta={r.growth.mom.delta} />
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
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
