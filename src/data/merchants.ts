/**
 * Merchant catalog used for search suggestions on Add a trial and for
 * recognising the merchant inside a pasted SMS.
 *
 * TEAM TODO: fill `usualPricePaise` from each app's current Indian pricing
 * page, and add the aliases you see in real bank SMS.
 */
export interface Merchant {
  id: string;
  name: string;
  /** Upper case words that identify this merchant inside an SMS. */
  aliases: string[];
  category: 'video' | 'music' | 'fitness' | 'food' | 'learning' | 'cloud' | 'dating' | 'news' | 'ai' | 'other';
  usualPricePaise: number | null;
}

export const MERCHANTS: Merchant[] = [
  { id: 'netflix', name: 'Netflix', aliases: ['NETFLIX'], category: 'video', usualPricePaise: null },
  { id: 'prime', name: 'Amazon Prime', aliases: ['AMAZON PRIME', 'AMAZONPRIME', 'PRIME VIDEO'], category: 'video', usualPricePaise: null },
  { id: 'jiohotstar', name: 'JioHotstar', aliases: ['JIOHOTSTAR', 'HOTSTAR'], category: 'video', usualPricePaise: null },
  { id: 'sonyliv', name: 'SonyLIV', aliases: ['SONYLIV', 'SONY LIV'], category: 'video', usualPricePaise: null },
  { id: 'zee5', name: 'ZEE5', aliases: ['ZEE5'], category: 'video', usualPricePaise: null },
  { id: 'youtube', name: 'YouTube Premium', aliases: ['YOUTUBE', 'YOUTUBE PREMIUM'], category: 'video', usualPricePaise: null },
  { id: 'youtubemusic', name: 'YouTube Music', aliases: ['YOUTUBE MUSIC', 'YT MUSIC', 'YTMUSIC'], category: 'music', usualPricePaise: null },
  { id: 'spotify', name: 'Spotify Premium', aliases: ['SPOTIFY'], category: 'music', usualPricePaise: null },
  { id: 'jiosaavn', name: 'JioSaavn Pro', aliases: ['JIOSAAVN', 'SAAVN'], category: 'music', usualPricePaise: null },
  { id: 'applemusic', name: 'Apple Music', aliases: ['APPLE MUSIC'], category: 'music', usualPricePaise: null },
  { id: 'cultfit', name: 'Cult.fit', aliases: ['CULTFIT', 'CULT.FIT', 'CUREFIT'], category: 'fitness', usualPricePaise: null },
  { id: 'swiggyone', name: 'Swiggy One', aliases: ['SWIGGY'], category: 'food', usualPricePaise: null },
  { id: 'zomatogold', name: 'Zomato Gold', aliases: ['ZOMATO'], category: 'food', usualPricePaise: null },
  { id: 'linkedin', name: 'LinkedIn Premium', aliases: ['LINKEDIN'], category: 'learning', usualPricePaise: null },
  { id: 'coursera', name: 'Coursera Plus', aliases: ['COURSERA'], category: 'learning', usualPricePaise: null },
  { id: 'duolingo', name: 'Duolingo Super', aliases: ['DUOLINGO'], category: 'learning', usualPricePaise: null },
  { id: 'googleone', name: 'Google One', aliases: ['GOOGLE ONE', 'GOOGLEONE'], category: 'cloud', usualPricePaise: null },
  { id: 'microsoft365', name: 'Microsoft 365', aliases: ['MICROSOFT 365', 'MICROSOFT'], category: 'cloud', usualPricePaise: null },
  { id: 'icloud', name: 'iCloud+', aliases: ['ICLOUD'], category: 'cloud', usualPricePaise: null },
  { id: 'audible', name: 'Audible', aliases: ['AUDIBLE'], category: 'other', usualPricePaise: null },
  { id: 'kindle', name: 'Kindle Unlimited', aliases: ['KINDLE'], category: 'other', usualPricePaise: null },
  { id: 'timesprime', name: 'Times Prime', aliases: ['TIMES PRIME', 'TIMESPRIME'], category: 'news', usualPricePaise: null },
  { id: 'tinder', name: 'Tinder', aliases: ['TINDER'], category: 'dating', usualPricePaise: null },
  { id: 'bumble', name: 'Bumble', aliases: ['BUMBLE'], category: 'dating', usualPricePaise: null },
  { id: 'chatgpt', name: 'ChatGPT Plus', aliases: ['OPENAI', 'CHATGPT'], category: 'ai', usualPricePaise: null },
];

export function searchMerchants(query: string, limit = 5): Merchant[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return MERCHANTS.filter(
    (m) => m.name.toLowerCase().includes(q) || m.aliases.some((a) => a.toLowerCase().includes(q)),
  ).slice(0, limit);
}

/** Finds a catalog merchant mentioned anywhere in a piece of SMS text. Longest alias wins. */
export function findMerchantInText(text: string): Merchant | null {
  const upper = text.toUpperCase();
  let best: { merchant: Merchant; length: number } | null = null;
  for (const merchant of MERCHANTS) {
    for (const alias of merchant.aliases) {
      const pattern = new RegExp(`(^|[^A-Z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Z0-9]|$)`);
      if (pattern.test(upper) && (!best || alias.length > best.length)) {
        best = { merchant, length: alias.length };
      }
    }
  }
  return best?.merchant ?? null;
}

/**
 * Companies whose name appears in the SMS instead of the service. Real HDFC
 * SMS say "For Google mandate" for YouTube Music, so we ask which one it is.
 */
const BILLERS: Record<string, string[]> = {
  GOOGLE: ['youtube', 'youtubemusic', 'googleone'],
  APPLE: ['applemusic', 'icloud'],
  AMAZON: ['prime', 'audible', 'kindle'],
};

export function billerOptions(name: string | null): Merchant[] {
  if (!name) return [];
  const ids = BILLERS[name.trim().toUpperCase()] ?? [];
  return ids.map((id) => MERCHANTS.find((m) => m.id === id)).filter((m): m is Merchant => !!m);
}

export function merchantById(id: string | null): Merchant | null {
  return MERCHANTS.find((m) => m.id === id) ?? null;
}
