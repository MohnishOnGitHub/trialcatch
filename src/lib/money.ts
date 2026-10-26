/**
 * Money helpers. All amounts inside the app are integer paise (₹1 = 100 paise).
 */

/** Groups digits the Indian way: 1234567 -> "12,34,567". */
function groupIndian(whole: number): string {
  const s = String(whole);
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

/** Formats paise as rupees: 124700 -> "₹1,247", 11950 -> "₹119.50". */
export function formatINR(paise: number): string {
  const negative = paise < 0;
  const abs = Math.abs(Math.round(paise));
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;
  const text = fraction === 0 ? groupIndian(whole) : `${groupIndian(whole)}.${String(fraction).padStart(2, '0')}`;
  return `${negative ? '-' : ''}₹${text}`;
}

/**
 * Parses a rupee amount typed by a user or found in an SMS.
 * Accepts "119", "119.5", "1,567.00", "Rs. 199", "INR 499", "₹ 1,247".
 * Returns paise, or null when no amount can be read.
 */
export function parseRupeesToPaise(input: string): number | null {
  const cleaned = input.replace(/(rs\.?|inr|₹)/gi, '').replace(/,/g, '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ''] = cleaned.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
