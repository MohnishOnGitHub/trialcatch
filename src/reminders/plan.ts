/**
 * Decides WHEN reminders fire. Pure logic, no Expo imports, unit tested.
 *
 * Charges are stored as calendar days, so reminders fire at fixed local times:
 *   2 days before, 7 pm  ("in 2 days")
 *   1 day before, 7 pm   ("tomorrow")
 *   on the day, 9 am     ("today")
 */
import { formatINR } from '../lib/money';
import { fromDay, shortDay } from '../lib/dates';
import type { Subscription } from '../lib/types';

export type ReminderKind = 'd2' | 'd1' | 'dayOf' | 'snooze';

export interface PlannedReminder {
  subscriptionId: number;
  kind: ReminderKind;
  fireAt: Date;
  title: string;
  body: string;
}

export const REMINDER_TIMES = { eveningHour: 19, morningHour: 9, snoozeHour: 21 };

/** iOS keeps at most 64 scheduled notifications per app; stay under it. */
export const MAX_SCHEDULED = 60;

/** The day money leaves the account next: trial end for trials, renewal otherwise. */
export function chargeDay(sub: Subscription): string {
  return sub.status === 'trial' && sub.trialEndAt ? sub.trialEndAt : sub.nextChargeAt;
}

function at(day: string, daysBefore: number, hour: number): Date {
  const d = fromDay(day);
  d.setDate(d.getDate() - daysBefore);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function copy(sub: Subscription, kind: ReminderKind): { title: string; body: string } {
  const when = kind === 'd2' ? 'in 2 days' : kind === 'dayOf' ? 'today' : 'tomorrow';
  const amount = formatINR(sub.amountPaise);
  const day = shortDay(chargeDay(sub));
  if (sub.status === 'trial') {
    return {
      title: `${sub.name} trial ends ${when}`,
      body: `${amount} will be charged on ${day}. Keep it or cancel?`,
    };
  }
  return {
    title: `${sub.name} renews ${when}`,
    body: `${amount} will be debited on ${day}. Still using it?`,
  };
}

export function planForSubscription(sub: Subscription, now: Date): PlannedReminder[] {
  if (sub.status === 'cancelled') return [];
  const day = chargeDay(sub);
  const slots: { kind: ReminderKind; fireAt: Date }[] = [
    { kind: 'd2', fireAt: at(day, 2, REMINDER_TIMES.eveningHour) },
    { kind: 'd1', fireAt: at(day, 1, REMINDER_TIMES.eveningHour) },
    { kind: 'dayOf', fireAt: at(day, 0, REMINDER_TIMES.morningHour) },
  ];
  return slots
    .filter((s) => s.fireAt.getTime() > now.getTime())
    .map((s) => ({ subscriptionId: sub.id, ...s, ...copy(sub, s.kind) }));
}

/** All reminders for all subscriptions, soonest first, capped for iOS. */
export function planAll(subs: Subscription[], now: Date): PlannedReminder[] {
  return subs
    .flatMap((s) => planForSubscription(s, now))
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
    .slice(0, MAX_SCHEDULED);
}

/** "Remind me tonight": 9 pm today, or one hour from now if it is already past 8 pm. */
export function snoozeTime(now: Date): Date {
  const tonight = new Date(now);
  tonight.setHours(REMINDER_TIMES.snoozeHour, 0, 0, 0);
  if (tonight.getTime() - now.getTime() > 60 * 60 * 1000) return tonight;
  return new Date(now.getTime() + 60 * 60 * 1000);
}
