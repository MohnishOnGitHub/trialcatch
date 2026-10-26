/**
 * SMS fixtures for the parser tests.
 *
 * REAL_FIXTURES are real SMS from the team's phones, with UMNs partly masked.
 * SYNTHETIC_FIXTURES were written by hand to cover other cases; replace them
 * with real SMS from other banks as we collect them (Sprint 3).
 */
import type { ParsedSms } from '../../src/detection/parseSms';

export interface Fixture {
  name: string;
  sms: string;
  expect: Partial<Pick<ParsedSms, 'isAutoPay' | 'kind' | 'merchantName' | 'amountPaise' | 'isMaxAmount' | 'cycle' | 'date' | 'umn' | 'upiApp'>>;
}

export const REAL_FIXTURES: Fixture[] = [
  {
    name: 'HDFC Bank e-mandate pre debit, JioHotstar via PhonePe (real)',
    sms: 'E-Mandate!\nRs.149.00 will be deducted on 02/10/26, 00:00:00\nFor JioHotstar mandate\nUMN 694axxxxxxxxxxxxxxxxxxxxxxxx179c@ybl\nMaintain Balance\n-HDFC Bank',
    expect: {
      isAutoPay: true,
      kind: 'preDebit',
      merchantName: 'JioHotstar',
      amountPaise: 14900,
      date: '2026-10-02',
      umn: '694axxxxxxxxxxxxxxxxxxxxxxxx179c@ybl',
      upiApp: 'phonepe',
    },
  },
  {
    name: 'HDFC Bank e-mandate pre debit, Google (YouTube Music) via PhonePe (real)',
    sms: 'E-Mandate!\nRs.149.00 will be deducted on 03/10/26, 00:00:00\nFor Google mandate\nUMN 3b59xxxxxxxxxxxxxxxxxxxxxxxxce41@ybl\nMaintain Balance\n-HDFC Bank',
    expect: {
      isAutoPay: true,
      kind: 'preDebit',
      merchantName: 'Google',
      amountPaise: 14900,
      date: '2026-10-03',
      umn: '3b59xxxxxxxxxxxxxxxxxxxxxxxxce41@ybl',
      upiApp: 'phonepe',
    },
  },
];

const SYNTHETIC_FIXTURES: Fixture[] = [
  {
    name: 'mandate created, max amount, monthly, Google Pay handle',
    sms: 'AutoPay mandate created for SPOTIFY for max Rs 119.00, frequency monthly, on A/c XX1234. UMN abc123def@okaxis -Bank',
    expect: {
      isAutoPay: true,
      kind: 'mandateCreated',
      merchantName: 'Spotify Premium',
      amountPaise: 11900,
      isMaxAmount: true,
      cycle: 'monthly',
      umn: 'abc123def@okaxis',
      upiApp: 'gpay',
    },
  },
  {
    name: 'pre debit notice with date',
    sms: 'Dear Customer, Rs.199.00 will be debited from your a/c XX9876 on 28-10-2026 towards NETFLIX as per your UPI mandate. UMN: 7f3k9q2m1x@ybl',
    expect: {
      isAutoPay: true,
      kind: 'preDebit',
      merchantName: 'Netflix',
      amountPaise: 19900,
      date: '2026-10-28',
      umn: '7f3k9q2m1x@ybl',
      upiApp: 'phonepe',
    },
  },
  {
    name: 'debited, month name date',
    sms: 'INR 1,567.00 debited from A/c XX4455 on 05-Nov-26 for LINKEDIN via UPI AutoPay. Not you? Call your bank.',
    expect: {
      isAutoPay: true,
      kind: 'debited',
      merchantName: 'LinkedIn Premium',
      amountPaise: 156700,
      date: '2026-11-05',
    },
  },
  {
    name: 'revoked mandate',
    sms: 'Your UPI AutoPay mandate for YOUTUBE (UMN q8w7e6r5t4@paytm) has been revoked successfully.',
    expect: { isAutoPay: true, kind: 'revoked', merchantName: 'YouTube Premium', umn: 'q8w7e6r5t4@paytm', upiApp: 'paytm' },
  },
  {
    name: 'yearly mandate for a merchant not in the catalog',
    sms: 'E-mandate registered for Acme Notes for up to Rs 999, yearly. UMN zz11yy22xx@oksbi',
    expect: { isAutoPay: true, kind: 'mandateCreated', merchantName: 'Acme Notes', amountPaise: 99900, isMaxAmount: true, cycle: 'yearly', upiApp: 'gpay' },
  },
  {
    name: 'not an AutoPay SMS',
    sms: 'Your OTP for login is 482913. Do not share it with anyone.',
    expect: { isAutoPay: false, kind: 'unknown', amountPaise: null },
  },
];

export const FIXTURES: Fixture[] = [...REAL_FIXTURES, ...SYNTHETIC_FIXTURES];
