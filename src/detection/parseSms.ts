/**
 * Turns a pasted bank SMS into the fields of a subscription.
 *
 * Pure TypeScript with no React or Expo imports, so it runs in Jest and can be
 * reused later for automatic SMS reading on Android.
 *
 * The rules are deliberately generic (keywords + regex) because bank formats
 * differ. Add real, masked SMS from the team to __tests__/detection/fixtures.ts
 * and extend the patterns in RULES until they parse.
 */
import { findMerchantInText, type Merchant } from '../data/merchants';
import { toDay } from '../lib/dates';
import { parseRupeesToPaise } from '../lib/money';
import type { Cycle, DayString, UpiApp } from '../lib/types';

export type SmsKind = 'mandateCreated' | 'preDebit' | 'debited' | 'revoked' | 'unknown';

export type UnsureField = 'merchant' | 'amount' | 'cycle' | 'upiApp';

export interface ParsedSms {
  /** False when the text does not look like an AutoPay / mandate SMS at all. */
  isAutoPay: boolean;
  kind: SmsKind;
  merchant: Merchant | null;
  /** Catalog name when we recognised the merchant, else our best reading of the text. */
  merchantName: string | null;
  amountPaise: number | null;
  /** True when the SMS says "max", "up to" or "limit", so the real charge may be lower. */
  isMaxAmount: boolean;
  cycle: Cycle | null;
  /** The debit date or start date mentioned in the SMS. */
  date: DayString | null;
  umn: string | null;
  upiApp: UpiApp | null;
  /** 0 to 1. Below 0.6 the UI asks the user to check every field. */
  confidence: number;
  /** Fields the user should check before saving. */
  unsure: UnsureField[];
}

export const RULES = {
  autoPayWords: /\b(auto ?pay|e-?mandate|mandate|umn|recurring|standing instruction|si registered|subscription)\b/i,
  kinds: {
    revoked: /\b(revoked|revocation|cancell?ed|deactivated|paused)\b/i,
    mandateCreated: /\b(created|registered|set ?up|activated|enabled|successful(ly)?\s+(created|registered|set ?up))\b/i,
    preDebit: /\b(will be debited|to be debited|due on|scheduled (for|on)|upcoming|pre-?debit|will be deducted)\b/i,
    debited: /\b(debited|deducted|paid|executed|successful payment)\b/i,
  },
  money: /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/gi,
  maxWords: /\b(max(imum)?|up ?to|upto|limit)\b/i,
  umn: /\bUMN\s*(?:no\.?|number|id)?\s*[:\-]?\s*([A-Za-z0-9._-]+@[A-Za-z0-9._-]+|[A-Za-z0-9]{8,})/i,
  cycles: [
    { cycle: 'weekly' as const, pattern: /\bweekly\b/i },
    { cycle: 'monthly' as const, pattern: /\bmonthly\b|\bevery month\b/i },
    { cycle: 'quarterly' as const, pattern: /\bquarterly\b/i },
    { cycle: 'yearly' as const, pattern: /\b(yearly|annually|annual)\b/i },
  ],
  merchantFallback:
    /\b(?:for|to|towards|by|merchant|payee)\s+([A-Z][A-Za-z0-9&.'\- ]{1,40}?)(?=\s+(?:for|of|on|with|is|has|via|frequency|max|maximum|upto|up|amount|rs|inr|from|towards)\b|[.,;:]|\s*₹|$)/,
  upiHandles: [
    { app: 'gpay' as const, pattern: /@ok(axis|hdfcbank|icici|sbi)\b|\bgoogle ?pay\b|\bgpay\b/i },
    { app: 'phonepe' as const, pattern: /@(ybl|ibl|axl)\b|\bphonepe\b/i },
    { app: 'paytm' as const, pattern: /@(paytm|ptsbi|pthdfc|ptyes|ptaxis)\b|\bpaytm\b/i },
  ],
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function makeDay(year: number, month: number, day: number): DayString | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getMonth() !== month - 1) return null;
  return toDay(d);
}

function fullYear(y: string): number {
  const n = Number(y);
  return y.length === 2 ? 2000 + n : n;
}

/** Reads the first date in the text: 28-10-2026, 28/10/26, 28-Oct-26, 28 Oct 2026, 2026-10-28, 28 Oct. */
export function parseSmsDate(text: string, now: Date = new Date()): DayString | null {
  let m = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) return makeDay(Number(m[1]), Number(m[2]), Number(m[3]));

  m = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})\b/);
  if (m) return makeDay(fullYear(m[3]), Number(m[2]), Number(m[1]));

  m = text.match(/\b(\d{1,2})[- ]?([A-Za-z]{3})[a-z]*[- ,]*(\d{4}|\d{2})?\b/);
  while (m) {
    const month = MONTHS.indexOf(m[2].toLowerCase()) + 1;
    if (month > 0) {
      const year = m[3] ? fullYear(m[3]) : now.getFullYear();
      return makeDay(year, month, Number(m[1]));
    }
    const rest = text.slice((m.index ?? 0) + m[0].length);
    m = rest.match(/\b(\d{1,2})[- ]?([A-Za-z]{3})[a-z]*[- ,]*(\d{4}|\d{2})?\b/);
    text = rest;
  }
  return null;
}

function titleCase(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

function detectKind(text: string): SmsKind {
  const { kinds } = RULES;
  if (kinds.revoked.test(text)) return 'revoked';
  if (kinds.mandateCreated.test(text)) return 'mandateCreated';
  if (kinds.preDebit.test(text)) return 'preDebit';
  if (kinds.debited.test(text)) return 'debited';
  return 'unknown';
}

function detectAmount(text: string): { amountPaise: number | null; isMaxAmount: boolean } {
  const matches = [...text.matchAll(RULES.money)];
  if (matches.length === 0) return { amountPaise: null, isMaxAmount: false };
  // Prefer the amount right after "max" / "up to" when there is one.
  for (const match of matches) {
    const before = text.slice(Math.max(0, (match.index ?? 0) - 24), match.index);
    if (RULES.maxWords.test(before)) {
      return { amountPaise: parseRupeesToPaise(match[1]), isMaxAmount: true };
    }
  }
  return { amountPaise: parseRupeesToPaise(matches[0][1]), isMaxAmount: false };
}

function detectCycle(text: string): Cycle | null {
  return RULES.cycles.find((c) => c.pattern.test(text))?.cycle ?? null;
}

function detectUpiApp(text: string): UpiApp | null {
  return RULES.upiHandles.find((h) => h.pattern.test(text))?.app ?? null;
}

export function parseSms(raw: string, now: Date = new Date()): ParsedSms {
  const text = raw.replace(/\s+/g, ' ').trim();
  const isAutoPay = RULES.autoPayWords.test(text);

  const merchant = findMerchantInText(text);
  let merchantName = merchant?.name ?? null;
  if (!merchantName) {
    const fallback = text.match(RULES.merchantFallback);
    if (fallback && !/^(your|a\/c|ac|account|the)\b/i.test(fallback[1])) merchantName = titleCase(fallback[1]);
  }

  const { amountPaise, isMaxAmount } = detectAmount(text);
  const cycle = detectCycle(text);
  const umnMatch = text.match(RULES.umn);
  const umn = umnMatch ? umnMatch[1] : null;
  const upiApp = detectUpiApp(text);
  const date = parseSmsDate(text, now);

  const confidence =
    (merchant ? 0.3 : merchantName ? 0.15 : 0) +
    (amountPaise !== null ? 0.3 : 0) +
    (cycle ? 0.15 : 0) +
    (umn ? 0.15 : 0) +
    (isAutoPay ? 0.1 : 0);

  const unsure: UnsureField[] = [];
  if (!merchant) unsure.push('merchant');
  if (amountPaise === null) unsure.push('amount');
  if (!cycle) unsure.push('cycle');
  unsure.push('upiApp'); // Always a guess: the SMS comes from the bank, not the UPI app.

  return {
    isAutoPay,
    kind: isAutoPay ? detectKind(text) : 'unknown',
    merchant,
    merchantName,
    amountPaise,
    isMaxAmount,
    cycle,
    date,
    umn,
    upiApp,
    confidence: Math.round(confidence * 100) / 100,
    unsure,
  };
}
