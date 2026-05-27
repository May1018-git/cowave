import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKRW(amount: number, opts?: { compact?: boolean }) {
  const n = Math.round(amount);
  if (opts?.compact) {
    if (Math.abs(n) >= 1_0000_0000) {
      return `${(n / 1_0000_0000).toFixed(1).replace(/\.0$/, "")}억`;
    }
    if (Math.abs(n) >= 1_0000) return `${Math.round(n / 1_0000)}만`;
  }
  return n.toLocaleString("ko-KR");
}

export function formatNumber(n: number) {
  return n.toLocaleString("ko-KR");
}

export function formatPercent(p: number | null, fractionDigits = 1) {
  if (p === null || !Number.isFinite(p)) return "—";
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(fractionDigits)}%`;
}
