import { ArrowDown, ArrowUp, Minus, Sparkles } from "lucide-react";
import { cn, formatKRW, formatNumber, formatPercent } from "@/lib/utils";
import { getCategoryPath } from "@/lib/category-map";
import type { ProductRankRow } from "@/lib/types";

interface TopProductsTableProps {
  rows: ProductRankRow[];
  compact?: boolean;
}

function RankChange({ rank, prevRank }: { rank: number; prevRank: number | null }) {
  if (prevRank === null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-700">
        <Sparkles size={10} /> NEW
      </span>
    );
  }
  const diff = prevRank - rank;
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400">
        <Minus size={10} />
      </span>
    );
  }
  const Icon = diff > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium",
        diff > 0 ? "text-emerald-700" : "text-red-700",
      )}
    >
      <Icon size={10} />
      {Math.abs(diff)}
    </span>
  );
}

export function TopProductsTable({ rows, compact }: TopProductsTableProps) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs text-gray-500">
          <th className="py-2 pl-2 font-medium">#</th>
          <th className="py-2 font-medium">상품</th>
          {!compact && <th className="py-2 font-medium">카테고리</th>}
          <th className="py-2 text-right font-medium">매출</th>
          <th className="py-2 text-right font-medium">수량</th>
          <th className="py-2 pr-2 text-right font-medium">YoY</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.product.id} className="border-b last:border-b-0">
            <td className="py-2 pl-2">
              <div className="flex items-center gap-2">
                <span className="w-5 text-sm font-semibold text-gray-700">
                  {r.rank}
                </span>
                <RankChange rank={r.rank} prevRank={r.prevRank} />
              </div>
            </td>
            <td className="max-w-[14rem] truncate py-2 font-medium" title={r.product.name}>
              {r.product.name}
            </td>
            {!compact && (
              <td className="py-2 text-xs text-gray-500">
                {getCategoryPath(r.product.categoryCode).join(" › ")}
              </td>
            )}
            <td className="py-2 text-right tabular-nums">
              {formatKRW(r.grossAmount, { compact: true })}
            </td>
            <td className="py-2 text-right tabular-nums text-gray-600">
              {formatNumber(r.quantity)}
            </td>
            <td className="py-2 pr-2 text-right">
              <span
                className={cn(
                  "tabular-nums text-xs font-medium",
                  (r.growth.yoy.percent ?? 0) > 0 && "text-emerald-700",
                  (r.growth.yoy.percent ?? 0) < 0 && "text-red-700",
                )}
              >
                {formatPercent(r.growth.yoy.percent)}
              </span>
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
