/**
 * Decides what a pasted SMS means for subscriptions we already track.
 * Pure logic, unit tested in __tests__/detection/match.test.ts.
 */
import { addCycle, longDay, rollForward, toDay } from '../lib/dates';
import type { NewSubscription, Subscription } from '../lib/types';
import type { ParsedSms } from './parseSms';

/**
 * Finds the subscription this SMS is about: same mandate ID (UMN) first, else a
 * hand added entry with the same name and amount that has no UMN yet.
 */
export function findExisting(subs: Subscription[], parsed: ParsedSms, name: string): Subscription | undefined {
  if (parsed.umn) {
    const byUmn = subs.find((s) => s.umn === parsed.umn);
    if (byUmn) return byUmn;
  }
  const wanted = name.trim().toLowerCase();
  if (!wanted) return undefined;
  return subs.find(
    (s) =>
      s.status !== 'cancelled' &&
      !s.umn &&
      s.name.trim().toLowerCase() === wanted &&
      (parsed.amountPaise === null || s.amountPaise === parsed.amountPaise),
  );
}

/** What saving will do when this SMS is about something we already track. */
export function updateFor(existing: Subscription, parsed: ParsedSms, now: Date = new Date()): { label: string; next: NewSubscription } | null {
  const today = toDay(now);
  // Fill in what the hand added entry didn't know.
  const base: NewSubscription = {
    ...existing,
    umn: existing.umn ?? parsed.umn,
    upiApp: existing.upiApp === 'other' && parsed.upiApp ? parsed.upiApp : existing.upiApp,
  };
  switch (parsed.kind) {
    case 'revoked':
      return { label: `Mark ${existing.name} as cancelled`, next: { ...base, status: 'cancelled' } };
    case 'preDebit': {
      if (!parsed.date) break;
      const due = rollForward(parsed.date, existing.cycle, today);
      return {
        label: `Set next charge to ${longDay(due)}`,
        next: { ...base, nextChargeAt: due, trialEndAt: existing.status === 'trial' ? due : existing.trialEndAt },
      };
    }
    case 'debited': {
      const next = rollForward(addCycle(parsed.date ?? today, existing.cycle), existing.cycle, today);
      return {
        label: `Record the payment; next charge ${longDay(next)}`,
        next: { ...base, status: 'active', trialEndAt: null, nextChargeAt: next },
      };
    }
  }
  if (!existing.umn && parsed.umn) return { label: `Add the mandate ID to ${existing.name}`, next: base };
  return null;
}
