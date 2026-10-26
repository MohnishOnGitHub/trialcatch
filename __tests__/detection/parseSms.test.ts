import { parseSms, parseSmsDate } from '../../src/detection/parseSms';
import { FIXTURES, REAL_FIXTURES } from './fixtures';

const NOW = new Date(2026, 9, 26); // 26 Oct 2026

describe('parseSms fixtures', () => {
  it.each(FIXTURES.map((f) => [f.name, f] as const))('%s', (_name, fixture) => {
    const result = parseSms(fixture.sms, NOW);
    expect(result).toMatchObject(fixture.expect);
  });

  it('parses at least 90% of fixtures fully', () => {
    const passed = FIXTURES.filter((f) => {
      const r = parseSms(f.sms, NOW) as unknown as Record<string, unknown>;
      return Object.entries(f.expect).every(([k, v]) => r[k] === v);
    });
    expect(passed.length / FIXTURES.length).toBeGreaterThanOrEqual(0.9);
  });
});

describe('parseSms details', () => {
  it('marks confident results above 0.6', () => {
    expect(parseSms(FIXTURES[0].sms, NOW).confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('always flags the UPI app as something to check', () => {
    expect(parseSms(FIXTURES[0].sms, NOW).unsure).toContain('upiApp');
  });

  it('flags an unknown merchant as unsure', () => {
    const acme = FIXTURES.find((f) => f.expect.merchantName === 'Acme Notes')!;
    expect(parseSms(acme.sms, NOW).unsure).toContain('merchant');
  });

  it('offers Google services to choose from when the SMS only says Google', () => {
    const options = parseSms(REAL_FIXTURES[1].sms, NOW).billerOptions.map((m) => m.name);
    expect(options).toEqual(['YouTube Premium', 'YouTube Music', 'Google One']);
  });

  it('offers no choices when the merchant is recognised', () => {
    expect(parseSms(REAL_FIXTURES[0].sms, NOW).billerOptions).toEqual([]);
  });
});

describe('parseSmsDate', () => {
  it.each([
    ['on 28-10-2026', '2026-10-28'],
    ['on 28/10/26', '2026-10-28'],
    ['on 2026-10-28', '2026-10-28'],
    ['on 28-Oct-26', '2026-10-28'],
    ['on 28 October 2026', '2026-10-28'],
    ['on 3 Nov', '2026-11-03'],
    ['for 3 months', null],
    ['on 31-02-2026', null],
  ])('%s -> %s', (text, expected) => {
    expect(parseSmsDate(text, NOW)).toBe(expected);
  });
});
