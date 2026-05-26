import {
  addMonths,
  addYears,
  differenceInCalendarDays,
  format,
  parseISO,
  subDays,
} from "date-fns";
import type { GrowthMetric } from "./types";

export function computeGrowth(current: number, previous: number): GrowthMetric {
  const delta = current - previous;
  const percent =
    previous === 0 ? (current === 0 ? 0 : null) : (delta / previous) * 100;
  return { current, previous, delta, percent };
}

export interface ComparablePeriod {
  from: string;
  to: string;
}

export function previousPeriodMoM(range: ComparablePeriod): ComparablePeriod {
  const f = parseISO(range.from);
  const t = parseISO(range.to);
  return {
    from: format(addMonths(f, -1), "yyyy-MM-dd"),
    to: format(addMonths(t, -1), "yyyy-MM-dd"),
  };
}

export function previousPeriodYoY(range: ComparablePeriod): ComparablePeriod {
  const f = parseISO(range.from);
  const t = parseISO(range.to);
  return {
    from: format(addYears(f, -1), "yyyy-MM-dd"),
    to: format(addYears(t, -1), "yyyy-MM-dd"),
  };
}

export function rollingWindow(days: number): ComparablePeriod {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    from: format(subDays(today, days - 1), "yyyy-MM-dd"),
    to: format(today, "yyyy-MM-dd"),
  };
}

export function rangeLengthDays(range: ComparablePeriod): number {
  return differenceInCalendarDays(parseISO(range.to), parseISO(range.from)) + 1;
}
