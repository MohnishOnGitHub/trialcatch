export type Cycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type Status = 'trial' | 'active' | 'cancelled';

export type UpiApp = 'gpay' | 'phonepe' | 'paytm' | 'other';

export type Source = 'manual' | 'sms';

/** Dates are stored as local calendar days, `YYYY-MM-DD`. */
export type DayString = string;

export interface Subscription {
  id: number;
  name: string;
  merchantId: string | null;
  /** Amount charged per cycle, in paise. Never store money as floats. */
  amountPaise: number;
  /** Mandate limit from the SMS ("max Rs 999"), if known. */
  maxAmountPaise: number | null;
  cycle: Cycle;
  status: Status;
  /** Last day of the free or ₹1 trial. Only meaningful while status is `trial`. */
  trialEndAt: DayString | null;
  /** Next day money will be debited. */
  nextChargeAt: DayString;
  upiApp: UpiApp;
  /** Unique Mandate Number from the bank SMS, used to match later SMS. */
  umn: string | null;
  source: Source;
  createdAt: string;
}

export type NewSubscription = Omit<Subscription, 'id' | 'createdAt'>;

export type DecisionAction = 'keep' | 'cancel' | 'snooze';

export interface Decision {
  id: number;
  subscriptionId: number;
  action: DecisionAction;
  usageAnswer: 'lot' | 'little' | 'none' | null;
  savedPaise: number;
  createdAt: string;
}
