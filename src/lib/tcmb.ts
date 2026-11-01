import { XMLParser } from 'fast-xml-parser';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CHF';
export const SUPPORTED: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'CHF'];

export type RateEntry = { buying: number; selling: number };
export type RateMap = Record<CurrencyCode, RateEntry>;

// ── Process-level cache ──────────────────────────────────────
let _cache: { rates: RateMap; fetchedAt: Date } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 saat

const TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';

function dayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// ── TCMB XML çek + parse ─────────────────────────────────────
async function fetchFromTCMB(): Promise<{ rates: RateMap; xmlDate: Date } | null> {
  try {
    const res = await fetch(TCMB_URL, { cache: 'no-store' });
    if (!res.ok) return null;

    const xml    = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(xml);

    // TCMB XML yapısı: Tarih_Date.Currency (tekil → array normalize)
    const raw: unknown = parsed?.Tarih_Date?.Currency;
    const list: unknown[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

    const map = {} as RateMap;
    for (const cur of list) {
      const obj  = cur as Record<string, unknown>;
      const code = (obj['@_CurrencyCode'] ?? obj['CurrencyCode']) as string;
      if (!SUPPORTED.includes(code as CurrencyCode)) continue;

      const buying  = Number(obj.ForexBuying);
      const selling = Number(obj.ForexSelling);
      if (isNaN(buying) || isNaN(selling) || buying <= 0 || selling <= 0) continue;

      map[code as CurrencyCode] = { buying, selling };
    }

    if (Object.keys(map).length === 0) return null;

    // XML'den tarih parse et (MM/DD/YYYY formatı)
    const dateAttr = parsed?.Tarih_Date?.['@_Date'] as string | undefined;
    let xmlDate: Date;
    if (dateAttr) {
      const [mm, dd, yyyy] = dateAttr.split('/').map(Number);
      xmlDate = new Date(yyyy, mm - 1, dd);
    } else {
      xmlDate = dayStart(new Date());
    }

    return { rates: map, xmlDate };
  } catch (err) {
    console.error('[tcmb] XML fetch/parse hatası:', err);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────

/** Bugünün kurlarını döndür (process-level cache → TCMB → null). */
export async function getTodayRates(): Promise<RateMap | null> {
  const now = new Date();

  if (_cache && now.getTime() - _cache.fetchedAt.getTime() < CACHE_TTL_MS) {
    return _cache.rates;
  }

  const result = await fetchFromTCMB();
  if (!result) return _cache?.rates ?? null; // Son geçerli cache

  _cache = { rates: result.rates, fetchedAt: now };
  return result.rates;
}

/** currency için bugünün alış kurunu döndür (örn. 1 USD = 32.15 TRY). */
export async function getRate(currency: string): Promise<number | null> {
  if (!SUPPORTED.includes(currency as CurrencyCode)) return null;
  const rates = await getTodayRates();
  return rates?.[currency as CurrencyCode]?.buying ?? null;
}
