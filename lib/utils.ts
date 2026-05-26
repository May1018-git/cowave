import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKRW(amount: number, opts?: { compact?: boolean }) {
  if (opts?.compact) {
    if (amount >= 1_0000_0000) return `₩${(amount / 1_0000_0000).toFixed(1)}억`;
    if (amount >= 1_0000) return `₩${(amount / 1_0000).toFixed(1)}만`;
    return `₩${amount.toLocaleString("ko-KR")}`;
  }
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number) {
  return n.toLocaleString("ko-KR");
}

export function formatPercent(p: number | null, fractionDigits = 1) {
  if (p === null || !Number.isFinite(p)) return "—";
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(fractionDigits)}%`;
}
