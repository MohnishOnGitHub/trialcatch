import type { SQLiteDatabase } from 'expo-sqlite';

import type { Decision, DecisionAction, NewSubscription, Subscription } from '../lib/types';

interface SubscriptionRow {
  id: number;
  name: string;
  merchant_id: string | null;
  amount_paise: number;
  max_amount_paise: number | null;
  cycle: Subscription['cycle'];
  status: Subscription['status'];
  trial_end_at: string | null;
  next_charge_at: string;
  upi_app: Subscription['upiApp'];
  umn: string | null;
  source: Subscription['source'];
  created_at: string;
}

function toSubscription(r: SubscriptionRow): Subscription {
  return {
    id: r.id,
    name: r.name,
    merchantId: r.merchant_id,
    amountPaise: r.amount_paise,
    maxAmountPaise: r.max_amount_paise,
    cycle: r.cycle,
    status: r.status,
    trialEndAt: r.trial_end_at,
    nextChargeAt: r.next_charge_at,
    upiApp: r.upi_app,
    umn: r.umn,
    source: r.source,
    createdAt: r.created_at,
  };
}

export async function listSubscriptions(db: SQLiteDatabase): Promise<Subscription[]> {
  const rows = await db.getAllAsync<SubscriptionRow>('SELECT * FROM subscriptions ORDER BY next_charge_at ASC');
  return rows.map(toSubscription);
}

export async function findByUmn(db: SQLiteDatabase, umn: string): Promise<Subscription | null> {
  const row = await db.getFirstAsync<SubscriptionRow>('SELECT * FROM subscriptions WHERE umn = ?', umn);
  return row ? toSubscription(row) : null;
}

export async function insertSubscription(db: SQLiteDatabase, s: NewSubscription): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO subscriptions
      (name, merchant_id, amount_paise, max_amount_paise, cycle, status, trial_end_at, next_charge_at, upi_app, umn, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    s.name,
    s.merchantId,
    s.amountPaise,
    s.maxAmountPaise,
    s.cycle,
    s.status,
    s.trialEndAt,
    s.nextChargeAt,
    s.upiApp,
    s.umn,
    s.source,
    new Date().toISOString(),
  );
  return result.lastInsertRowId;
}

export async function updateSubscription(db: SQLiteDatabase, id: number, s: NewSubscription): Promise<void> {
  await db.runAsync(
    `UPDATE subscriptions SET
      name = ?, merchant_id = ?, amount_paise = ?, max_amount_paise = ?, cycle = ?, status = ?,
      trial_end_at = ?, next_charge_at = ?, upi_app = ?, umn = ?, source = ?
     WHERE id = ?`,
    s.name,
    s.merchantId,
    s.amountPaise,
    s.maxAmountPaise,
    s.cycle,
    s.status,
    s.trialEndAt,
    s.nextChargeAt,
    s.upiApp,
    s.umn,
    s.source,
    id,
  );
}

export async function deleteSubscription(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM subscriptions WHERE id = ?', id);
}

export async function addDecision(
  db: SQLiteDatabase,
  subscriptionId: number,
  action: DecisionAction,
  savedPaise = 0,
  usageAnswer: Decision['usageAnswer'] = null,
): Promise<void> {
  await db.runAsync(
    'INSERT INTO decisions (subscription_id, action, usage_answer, saved_paise, created_at) VALUES (?, ?, ?, ?, ?)',
    subscriptionId,
    action,
    usageAnswer,
    savedPaise,
    new Date().toISOString(),
  );
}

export interface DecisionWithName extends Decision {
  name: string;
}

export async function listDecisions(db: SQLiteDatabase): Promise<DecisionWithName[]> {
  return db.getAllAsync<DecisionWithName>(
    `SELECT d.id, d.subscription_id AS subscriptionId, d.action, d.usage_answer AS usageAnswer,
            d.saved_paise AS savedPaise, d.created_at AS createdAt, s.name
     FROM decisions d JOIN subscriptions s ON s.id = d.subscription_id
     ORDER BY d.created_at DESC`,
  );
}

export async function hasPastedSms(db: SQLiteDatabase, hash: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM pasted_sms WHERE sms_hash = ?', hash);
  return (row?.n ?? 0) > 0;
}

export async function recordPastedSms(db: SQLiteDatabase, hash: string, subscriptionId: number): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO pasted_sms (sms_hash, subscription_id, pasted_at) VALUES (?, ?, ?)',
    hash,
    subscriptionId,
    new Date().toISOString(),
  );
}

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
}

export async function resetAll(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('DELETE FROM decisions; DELETE FROM pasted_sms; DELETE FROM subscriptions;');
}
