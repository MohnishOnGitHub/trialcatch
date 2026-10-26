import { addCycle, monthlyEquivalentPaise, relativeDay, rollForward } from '../../src/lib/dates';
import { formatINR, parseRupeesToPaise } from '../../src/lib/money';

describe('money', () => {
  it.each([
    [0, '₹0'],
    [11900, '₹119'],
    [11950, '₹119.50'],
    [124700, '₹1,247'],
    [123456700, '₹12,34,567'],
  ])('formatINR(%i) = %s', (paise, text) => {
    expect(formatINR(paise)).toBe(text);
  });

  it.each([
    ['119', 11900],
    ['119.5', 11950],
    ['Rs. 1,567.00', 156700],
    ['₹ 499', 49900],
    ['abc', null],
    ['', null],
  ])('parseRupeesToPaise(%s) = %s', (text, paise) => {
    expect(parseRupeesToPaise(text)).toBe(paise);
  });
});

describe('dates', () => {
  it('adds cycles, clamping month ends', () => {
    expect(addCycle('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(addCycle('2026-10-28', 'yearly')).toBe('2027-10-28');
    expect(addCycle('2026-10-28', 'weekly')).toBe('2026-11-04');
  });

  it('rolls a past renewal forward to today or later', () => {
    expect(rollForward('2026-08-15', 'monthly', '2026-10-26')).toBe('2026-11-15');
    expect(rollForward('2026-10-26', 'monthly', '2026-10-26')).toBe('2026-10-26');
  });

  it('labels relative days', () => {
    const now = new Date(2026, 9, 26, 15, 0);
    expect(relativeDay('2026-10-26', now)).toBe('Today');
    expect(relativeDay('2026-10-27', now)).toBe('Tomorrow');
    expect(relativeDay('2026-10-30', now)).toBe('in 4 days');
  });

  it('converts yearly to a monthly equivalent', () => {
    expect(monthlyEquivalentPaise(120000, 'yearly')).toBe(10000);
  });
});
