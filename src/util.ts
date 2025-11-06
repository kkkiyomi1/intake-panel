import type { DayKey } from "./types";

export const WEEKDAYS_ZH = ["周一","周二","周三","周四","周五","周六","周日"];

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function pad(n: number) { return n < 10 ? `0${n}` : String(n); }

export function fmtDate(y: number, m: number, d: number): DayKey {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function getMonthDates(year: number, month: number): DayKey[] {
  const n = daysInMonth(year, month);
  return Array.from({ length: n }, (_, i) => fmtDate(year, month, i + 1));
}

export function getWeekdayZh(dateKey: DayKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const wd = new Date(y, m - 1, d).getDay();
  return WEEKDAYS_ZH[wd === 0 ? 6 : wd - 1];
}

export function computeStreaks(dateKeys: DayKey[], isComplete: (k: DayKey) => boolean) {
  const streaks: Record<DayKey, number> = {};
  let cur = 0; let longest = 0;
  for (const k of dateKeys) {
    if (isComplete(k)) cur += 1; else cur = 0;
    streaks[k] = cur; longest = Math.max(longest, cur);
  }
  return { streaks, longest };
}

export function groupByWeeks(dateKeys: DayKey[]) {
  // Return array of arrays (weeks). Start from 1st of month, slice into chunks of 7 visually.
  const out: DayKey[][] = [];
  let week: DayKey[] = [];
  for (const k of dateKeys) {
    week.push(k);
    if (week.length === 7) { out.push(week); week = []; }
  }
  if (week.length) out.push(week);
  return out;
}
