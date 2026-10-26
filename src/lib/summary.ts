import { addCycle, daysUntil, monthlyEquivalentPaise, rollForward, toDay } from './dates';
import type { NewSubscription, Subscription } from './types';
import { chargeDay } from '../reminders/plan';

export function activeSubs(subs: Subscription[]): Subscription[] {
  return subs.filter((s) => s.status !== 'cancelled');
}

/** Everything that will charge in the next `days` days, soonest first. */
export function chargingSoon(subs: Subscription[], now = new Date(), days = 7): Subscription[] {
  return activeSubs(subs)
    .filter((s) => {
      const n = daysUntil(chargeDay(s), now);
      return n >= 0 && n <= days;
    })
    .sort((a, b) => chargeDay(a).localeCompare(chargeDay(b)));
}

export function monthlyTotalPaise(subs: Subscription[]): number {
  return activeSubs(subs).reduce((sum, s) => sum + monthlyEquivalentPaise(s.amountPaise, s.cycle), 0);
}

export function trialCount(subs: Subscription[]): number {
  return subs.filter((s) => s.status === 'trial').length;
}

/**
 * Brings a subscription's dates up to today. A trial whose end day has passed
 * becomes active; a renewal day in the past moves forward by whole cycles.
 * Returns null when nothing changed.
 */
export function bringUpToDate(s: Subscription, now = new Date()): NewSubscription | null {
  const today = toDay(now);
  if (s.status === 'trial' && s.trialEndAt && s.trialEndAt < today) {
    return {
      ...s,
      status: 'active',
      trialEndAt: null,
      nextChargeAt: rollForward(addCycle(s.trialEndAt, s.cycle), s.cycle, today),
    };
  }
  if (s.status === 'active' && s.nextChargeAt < today) {
    return { ...s, nextChargeAt: rollForward(s.nextChargeAt, s.cycle, today) };
  }
  return null;
}
