import { planAll, planForSubscription, snoozeTime } from '../../src/reminders/plan';
import type { Subscription } from '../../src/lib/types';

function sub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 1,
    name: 'Spotify Premium',
    merchantId: 'spotify',
    amountPaise: 11900,
    maxAmountPaise: null,
    cycle: 'monthly',
    status: 'trial',
    trialEndAt: '2026-10-30',
    nextChargeAt: '2026-10-30',
    upiApp: 'gpay',
    umn: null,
    source: 'manual',
    createdAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('planForSubscription', () => {
  const now = new Date(2026, 9, 26, 12, 0); // 26 Oct, noon

  it('plans 2 days before, 1 day before and the morning of', () => {
    const plan = planForSubscription(sub(), now);
    expect(plan.map((p) => p.kind)).toEqual(['d2', 'd1', 'dayOf']);
    expect(plan[0].fireAt).toEqual(new Date(2026, 9, 28, 19, 0));
    expect(plan[1].fireAt).toEqual(new Date(2026, 9, 29, 19, 0));
    expect(plan[2].fireAt).toEqual(new Date(2026, 9, 30, 9, 0));
  });

  it('skips reminders that are already in the past', () => {
    const plan = planForSubscription(sub({ trialEndAt: '2026-10-27', nextChargeAt: '2026-10-27' }), now);
    expect(plan.map((p) => p.kind)).toEqual(['d1', 'dayOf']);
  });

  it('plans nothing for cancelled subscriptions', () => {
    expect(planForSubscription(sub({ status: 'cancelled' }), now)).toEqual([]);
  });

  it('writes trial copy with the amount and day', () => {
    const [first] = planForSubscription(sub(), now);
    expect(first.title).toBe('Spotify Premium trial ends in 2 days');
    expect(first.body).toBe('₹119 will be charged on 30 Oct. Keep it or cancel?');
  });

  it('uses the renewal date for active subscriptions', () => {
    const plan = planForSubscription(sub({ status: 'active', trialEndAt: null, nextChargeAt: '2026-11-02' }), now);
    expect(plan[0].title).toBe('Spotify Premium renews in 2 days');
    expect(plan[2].fireAt).toEqual(new Date(2026, 10, 2, 9, 0));
  });
});

describe('planAll', () => {
  it('sorts soonest first and caps at 60', () => {
    const now = new Date(2026, 9, 1);
    const subs = Array.from({ length: 30 }, (_, i) =>
      sub({ id: i + 1, trialEndAt: null, status: 'active', nextChargeAt: `2026-11-${String((i % 28) + 1).padStart(2, '0')}` }),
    );
    const plan = planAll(subs, now);
    expect(plan).toHaveLength(60);
    for (let i = 1; i < plan.length; i++) {
      expect(plan[i].fireAt.getTime()).toBeGreaterThanOrEqual(plan[i - 1].fireAt.getTime());
    }
  });
});

describe('snoozeTime', () => {
  it('is 9 pm today during the day', () => {
    expect(snoozeTime(new Date(2026, 9, 26, 14, 0))).toEqual(new Date(2026, 9, 26, 21, 0));
  });

  it('is one hour later late in the evening', () => {
    expect(snoozeTime(new Date(2026, 9, 26, 20, 30))).toEqual(new Date(2026, 9, 26, 21, 30));
  });
});
