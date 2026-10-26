import { bringUpToDate, chargingSoon, monthlyTotalPaise } from '../../src/lib/summary';
import type { Subscription } from '../../src/lib/types';

const base: Subscription = {
  id: 1,
  name: 'Netflix',
  merchantId: 'netflix',
  amountPaise: 14900,
  maxAmountPaise: null,
  cycle: 'monthly',
  status: 'active',
  trialEndAt: null,
  nextChargeAt: '2026-10-28',
  upiApp: 'paytm',
  umn: null,
  source: 'manual',
  createdAt: '2026-10-01T00:00:00.000Z',
};

const now = new Date(2026, 9, 26, 10, 0);

describe('summary', () => {
  it('lists only charges in the next 7 days and skips cancelled', () => {
    const subs: Subscription[] = [
      { ...base, id: 1, nextChargeAt: '2026-10-28' },
      { ...base, id: 2, nextChargeAt: '2026-11-20' },
      { ...base, id: 3, nextChargeAt: '2026-10-27', status: 'cancelled' },
      { ...base, id: 4, status: 'trial', trialEndAt: '2026-10-27', nextChargeAt: '2026-10-27' },
    ];
    expect(chargingSoon(subs, now).map((s) => s.id)).toEqual([4, 1]);
  });

  it('adds monthly equivalents, ignoring cancelled', () => {
    const subs: Subscription[] = [
      { ...base, amountPaise: 14900 },
      { ...base, id: 2, amountPaise: 120000, cycle: 'yearly' },
      { ...base, id: 3, amountPaise: 99900, status: 'cancelled' },
    ];
    expect(monthlyTotalPaise(subs)).toBe(24900);
  });

  it('turns an ended trial into an active subscription', () => {
    const updated = bringUpToDate({ ...base, status: 'trial', trialEndAt: '2026-10-20', nextChargeAt: '2026-10-20' }, now);
    expect(updated).toMatchObject({ status: 'active', trialEndAt: null, nextChargeAt: '2026-11-20' });
  });

  it('rolls a past renewal forward', () => {
    expect(bringUpToDate({ ...base, nextChargeAt: '2026-09-28' }, now)).toMatchObject({ nextChargeAt: '2026-10-28' });
  });

  it('leaves current subscriptions alone', () => {
    expect(bringUpToDate(base, now)).toBeNull();
  });
});
