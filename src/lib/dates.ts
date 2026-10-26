import { addMonths, addQuarters, addWeeks, addYears, differenceInCalendarDays, format, parse } from 'date-fns';

import type { Cycle, DayString } from './types';

/** Date -> "2026-10-28" in local time. */
export function toDay(date: Date): DayString {
  return format(date, 'yyyy-MM-dd');
}

/** "2026-10-28" -> Date at local midnight. */
export function fromDay(day: DayString): Date {
  return parse(day, 'yyyy-MM-dd', new Date(0));
}

export function addDays(day: DayString, days: number): DayString {
  const d = fromDay(day);
  d.setDate(d.getDate() + days);
  return toDay(d);
}

export function addCycle(day: DayString, cycle: Cycle, times = 1): DayString {
  const d = fromDay(day);
  switch (cycle) {
    case 'weekly':
      return toDay(addWeeks(d, times));
    case 'monthly':
      return toDay(addMonths(d, times));
    case 'quarterly':
      return toDay(addQuarters(d, times));
    case 'yearly':
      return toDay(addYears(d, times));
  }
}

/** Moves a renewal date forward by whole cycles until it is today or later. */
export function rollForward(day: DayString, cycle: Cycle, today: DayString): DayString {
  let next = day;
  let guard = 0;
  while (next < today && guard < 1000) {
    next = addCycle(next, cycle);
    guard += 1;
  }
  return next;
}

export function daysUntil(day: DayString, now: Date = new Date()): number {
  return differenceInCalendarDays(fromDay(day), now);
}

/** "Today", "Tomorrow", "in 3 days", "2 days ago". */
export function relativeDay(day: DayString, now: Date = new Date()): string {
  const n = daysUntil(day, now);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n > 1) return `in ${n} days`;
  return `${-n} days ago`;
}

/** "28 Oct" */
export function shortDay(day: DayString): string {
  return format(fromDay(day), 'd MMM');
}

/** "Wed, 28 Oct" */
export function longDay(day: DayString): string {
  return format(fromDay(day), 'EEE, d MMM');
}

/** What a charge costs per month, for the monthly total on Home. */
export function monthlyEquivalentPaise(amountPaise: number, cycle: Cycle): number {
  switch (cycle) {
    case 'weekly':
      return Math.round((amountPaise * 52) / 12);
    case 'monthly':
      return amountPaise;
    case 'quarterly':
      return Math.round(amountPaise / 3);
    case 'yearly':
      return Math.round(amountPaise / 12);
  }
}

export const CYCLE_LABEL: Record<Cycle, string> = {
  weekly: 'week',
  monthly: 'month',
  quarterly: 'quarter',
  yearly: 'year',
};
