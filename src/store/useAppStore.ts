import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';

import * as repo from '../db/repo';
import { addDays, toDay } from '../lib/dates';
import { bringUpToDate } from '../lib/summary';
import type { Decision, NewSubscription, Subscription } from '../lib/types';
import { cancelRemindersFor, scheduleSnooze, syncReminders } from '../reminders/notifications';

interface AppState {
  db: SQLiteDatabase | null;
  ready: boolean;
  onboardingDone: boolean;
  subscriptions: Subscription[];
  decisions: repo.DecisionWithName[];

  init: (db: SQLiteDatabase) => Promise<void>;
  refresh: () => Promise<void>;
  add: (s: NewSubscription) => Promise<number>;
  update: (id: number, s: NewSubscription) => Promise<void>;
  remove: (id: number) => Promise<void>;
  keep: (id: number, usage?: Decision['usageAnswer']) => Promise<void>;
  confirmCancelled: (id: number) => Promise<void>;
  snooze: (id: number) => Promise<Date | null>;
  finishOnboarding: () => Promise<void>;
  loadSampleData: () => Promise<void>;
  resetAll: () => Promise<void>;
}

/** Never store a charge date in the past: roll it to the next one. */
function upToDate(s: NewSubscription): NewSubscription {
  return bringUpToDate({ ...s, id: 0, createdAt: '' }) ?? s;
}

function requireDb(db: SQLiteDatabase | null): SQLiteDatabase {
  if (!db) throw new Error('Database not ready yet');
  return db;
}

export const useAppStore = create<AppState>((set, get) => ({
  db: null,
  ready: false,
  onboardingDone: false,
  subscriptions: [],
  decisions: [],

  /** Runs on every app open: load data, bring dates up to today, reschedule reminders. */
  init: async (db) => {
    const onboardingDone = (await repo.getSetting(db, 'onboardingDone')) === 'true';
    const subs = await repo.listSubscriptions(db);
    for (const s of subs) {
      const updated = bringUpToDate(s);
      if (updated) await repo.updateSubscription(db, s.id, updated);
    }
    set({ db, onboardingDone });
    await get().refresh();
    set({ ready: true });
  },

  refresh: async () => {
    const db = requireDb(get().db);
    const [subscriptions, decisions] = await Promise.all([repo.listSubscriptions(db), repo.listDecisions(db)]);
    set({ subscriptions, decisions });
    await syncReminders(subscriptions).catch(() => undefined);
  },

  add: async (s) => {
    const id = await repo.insertSubscription(requireDb(get().db), upToDate(s));
    await get().refresh();
    return id;
  },

  update: async (id, s) => {
    await repo.updateSubscription(requireDb(get().db), id, upToDate(s));
    await get().refresh();
  },

  remove: async (id) => {
    await cancelRemindersFor(id).catch(() => undefined);
    await repo.deleteSubscription(requireDb(get().db), id);
    await get().refresh();
  },

  keep: async (id, usage = null) => {
    await repo.addDecision(requireDb(get().db), id, 'keep', 0, usage);
    await get().refresh();
  },

  confirmCancelled: async (id) => {
    const db = requireDb(get().db);
    const sub = get().subscriptions.find((s) => s.id === id);
    if (!sub) return;
    await repo.updateSubscription(db, id, { ...sub, status: 'cancelled' });
    await repo.addDecision(db, id, 'cancel', sub.amountPaise);
    await cancelRemindersFor(id).catch(() => undefined);
    await get().refresh();
  },

  snooze: async (id) => {
    const sub = get().subscriptions.find((s) => s.id === id);
    if (!sub) return null;
    await repo.addDecision(requireDb(get().db), id, 'snooze');
    const at = await scheduleSnooze(sub).catch(() => null);
    await get().refresh();
    return at;
  },

  finishOnboarding: async () => {
    await repo.setSetting(requireDb(get().db), 'onboardingDone', 'true');
    set({ onboardingDone: true });
  },

  /** Fills the app with believable data for demos and usability tests. */
  loadSampleData: async () => {
    const db = requireDb(get().db);
    const today = toDay(new Date());
    const samples: NewSubscription[] = [
      { name: 'Spotify Premium', merchantId: 'spotify', amountPaise: 11900, maxAmountPaise: 11900, cycle: 'monthly', status: 'trial', trialEndAt: addDays(today, 1), nextChargeAt: addDays(today, 1), upiApp: 'gpay', umn: null, source: 'manual' },
      { name: 'Cult.fit', merchantId: 'cultfit', amountPaise: 49900, maxAmountPaise: null, cycle: 'monthly', status: 'active', trialEndAt: null, nextChargeAt: addDays(today, 3), upiApp: 'phonepe', umn: null, source: 'manual' },
      { name: 'Netflix', merchantId: 'netflix', amountPaise: 14900, maxAmountPaise: null, cycle: 'monthly', status: 'active', trialEndAt: null, nextChargeAt: addDays(today, 12), upiApp: 'paytm', umn: null, source: 'manual' },
      { name: 'YouTube Premium', merchantId: 'youtube', amountPaise: 14900, maxAmountPaise: null, cycle: 'monthly', status: 'active', trialEndAt: null, nextChargeAt: addDays(today, 18), upiApp: 'gpay', umn: null, source: 'manual' },
      { name: 'LinkedIn Premium', merchantId: 'linkedin', amountPaise: 156700, maxAmountPaise: null, cycle: 'monthly', status: 'trial', trialEndAt: addDays(today, 21), nextChargeAt: addDays(today, 21), upiApp: 'phonepe', umn: null, source: 'manual' },
    ];
    for (const s of samples) await repo.insertSubscription(db, s);
    await get().refresh();
  },

  resetAll: async () => {
    await repo.resetAll(requireDb(get().db));
    await get().refresh();
  },
}));

export function useSubscription(id: number): Subscription | undefined {
  return useAppStore((s) => s.subscriptions.find((x) => x.id === id));
}
