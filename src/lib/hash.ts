/**
 * Small non cryptographic hash (FNV-1a) used only to notice when the same SMS
 * is pasted twice. We store this hash, never the SMS text.
 */
export function hashText(text: string): string {
  const normalised = text.replace(/\s+/g, ' ').trim().toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < normalised.length; i++) {
    h ^= normalised.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
