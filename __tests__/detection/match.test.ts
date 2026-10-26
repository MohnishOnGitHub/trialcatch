import { findExisting, updateFor } from '../../src/detection/match';
import { parseSms } from '../../src/detection/parseSms';
import type { Subscription } from '../../src/lib/types';
import { REAL_FIXTURES } from './fixtures';

const NOW = new Date(2026, 9, 26); // 26 Oct 2026
const hotstarSms = parseSms(REAL_FIXTURES[0].sms, NOW);

const handAdded: Subscription = {
  id: 7,
  name: 'JioHotstar',
  merchantId: 'jiohotstar',
  amountPaise: 14900,
  maxAmountPaise: null,
  cycle: 'monthly',
  status: 'active',
  trialEndAt: null,
  nextChargeAt: '2026-11-05',
  upiApp: 'other',
  umn: null,
  source: 'manual',
  createdAt: '2026-10-20T00:00:00.000Z',
};

describe('findExisting', () => {
  it('matches a hand added entry by name and amount', () => {
    expect(findExisting([handAdded], hotstarSms, 'JioHotstar')?.id).toBe(7);
  });

  it('matches by UMN even when the name differs', () => {
    const linked = { ...handAdded, name: 'Hotstar', umn: hotstarSms.umn };
    expect(findExisting([linked], hotstarSms, 'JioHotstar')?.id).toBe(7);
  });

  it('does not match a different amount or a cancelled entry', () => {
    expect(findExisting([{ ...handAdded, amountPaise: 29900 }], hotstarSms, 'JioHotstar')).toBeUndefined();
    expect(findExisting([{ ...handAdded, status: 'cancelled' }], hotstarSms, 'JioHotstar')).toBeUndefined();
  });
});

describe('updateFor', () => {
  it('moves a past pre debit date to the next charge and fills in UMN and UPI app', () => {
    const result = updateFor(handAdded, hotstarSms, NOW);
    expect(result?.next).toMatchObject({ nextChargeAt: '2026-11-02', umn: hotstarSms.umn, upiApp: 'phonepe' });
    expect(result?.label).toBe('Set next charge to Mon, 2 Nov');
  });

  it('marks a revoked mandate as cancelled', () => {
    const revoked = parseSms('Your UPI AutoPay mandate for JioHotstar has been revoked.', NOW);
    expect(updateFor(handAdded, revoked, NOW)?.next.status).toBe('cancelled');
  });
});
