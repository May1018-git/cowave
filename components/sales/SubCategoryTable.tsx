import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn, formatKRW, formatNumber, formatPercent } from "@/lib/utils";
import type { SubCategoryRow } from "@/lib/data-source";

interface SubCategoryTableProps {
  rows: SubCategoryRow[];
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

export function SubCategoryTable({ rows }: SubCategoryTableProps) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs text-gray-500">
          <th className="py-2 pl-2 font-medium">카테고리</th>
          <th className="py-2 text-right font-medium">매출</th>
          <th className="py-2 text-right font-medium">주문수</th>
          <th className="py-2 text-right font-medium">객단가</th>
          <th className="py-2 text-right font-medium">YoY</th>
          <th className="py-2 pr-2 text-right font-medium">MoM</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.code} className="border-b last:border-b-0">
            <td className="py-2 pl-2 font-medium">{r.name}</td>
            <td className="py-2 text-right tabular-nums">
              {formatKRW(r.grossAmount, { compact: true })}
            </td>
            <td className="py-2 text-right tabular-nums text-gray-600">
              {formatNumber(r.orders)}
            </td>
            <td className="py-2 text-right tabular-nums text-gray-600">
              {formatKRW(r.averageOrderValue)}원
            </td>
            <td className="py-2 text-right">
              <GrowthCell percent={r.growth.yoy.percent} />
            </td>
            <td className="py-2 pr-2 text-right">
              <GrowthCell percent={r.growth.mom.percent} />
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={6} className="py-8 text-center text-sm text-gray-400">
              데이터가 없습니다
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
