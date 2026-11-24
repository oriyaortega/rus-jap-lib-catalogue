// Сведения о людях из Викиданных и вступления статей Википедии.
// Кэш — в localStorage на 7 дней, тот же ключ, что у исходной версии сайта.
import { MONTHS } from './text';
import type { Catalog, WdDate, WdMap, WdPerson, WdState } from '../types';

const WD_API = 'https://www.wikidata.org/w/api.php';
const WD_CACHE_KEY = 'wd-cache-v2';
const WD_TTL = 7 * 24 * 3600 * 1000;

type Cache = Record<string, { t: number; d: WdPerson }>;
// Ответ wbgetentities — только используемые поля
export interface WdValue { time?: string; precision?: number; id?: string }
export interface WdEntity {
  missing?: string;
  labels?: Record<string, { value: string }>;
  aliases?: Record<string, { value: string }[]>;
  claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]>;
  sitelinks?: Record<string, { title: string }>;
}

const readCache = (): Cache => { try { return JSON.parse(localStorage.getItem(WD_CACHE_KEY) || 'null') || {}; } catch { return {}; } };
const writeCache = (c: Cache) => { try { localStorage.setItem(WD_CACHE_KEY, JSON.stringify(c)); } catch { /* недоступно */ } };
const claim = (e: WdEntity, p: string): unknown => e.claims?.[p]?.[0]?.mainsnak?.datavalue?.value ?? null;

export function wdDate(v: WdValue | null): WdDate | null {
  const m = v?.time?.match(/^([+-])(\d+)-(\d\d)-(\d\d)/);
  if (!v || !m) return null;
  const y = parseInt(m[2], 10) * (m[1] === '-' ? -1 : 1);
  const yStr = y < 0 ? `${-y} до н. э.` : String(y);
  const precision = v.precision ?? 0;
  if (precision >= 11) return { year: y, text: `${+m[4]} ${MONTHS[+m[3] - 1]} ${yStr}` };
  if (precision >= 9) return { year: y, text: yStr };
  return { year: y, text: `ок. ${yStr}` };
}

export function parseEntity(e: WdEntity): WdPerson {
  const label = (l: string) => e.labels?.[l]?.value ?? null;
  const img = claim(e, 'P18') as string | null;
  return {
    ru: label('ru'), ja: label('ja'), en: label('en'),
    kana: claim(e, 'P1814') as string | null,
    born: wdDate(claim(e, 'P569') as WdValue | null),
    died: wdDate(claim(e, 'P570') as WdValue | null),
    birthplaceId: (claim(e, 'P19') as WdValue | null)?.id ?? null,
    birthplace: null,
    image: img ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(img)}?width=240` : null,
    ruwiki: e.sitelinks?.ruwiki?.title ?? null,
    jawiki: e.sitelinks?.jawiki?.title ?? null,
    aliases: ['ru', 'en', 'ja'].flatMap((l) => (e.aliases?.[l] || []).map((a) => a.value)),
  };
}

async function wdGet(ids: string[], props: string): Promise<Record<string, WdEntity>> {
  const out: Record<string, WdEntity> = {};
  for (let i = 0; i < ids.length; i += 50) {
    const url = `${WD_API}?action=wbgetentities&ids=${ids.slice(i, i + 50).join('|')}&props=${props}` +
      `&languages=ru|ja|en&sitefilter=ruwiki|jawiki&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    Object.assign(out, (await res.json()).entities || {});
  }
  return out;
}

// Сведения обо всех людях каталога: из кэша, недостающие — запросом к Викиданным
export async function loadWikidata(catalog: Catalog): Promise<{ wd: WdMap; state: WdState }> {
  const cache = readCache(), now = Date.now();
  const wd: WdMap = {};
  const qids = [...new Set([...catalog.authors, ...catalog.translators].map((p) => p.wikidata).filter((q): q is string => !!q))];
  qids.forEach((q) => { if (cache[q]) wd[q] = cache[q].d; });
  const missing = qids.filter((q) => !cache[q] || now - cache[q].t > WD_TTL);
  try {
    if (missing.length) {
      const ents = await wdGet(missing, 'labels|aliases|claims|sitelinks');
      for (const [q, e] of Object.entries(ents)) if (e.missing === undefined) wd[q] = parseEntity(e);
      const places = [...new Set(missing.map((q) => wd[q]?.birthplaceId).filter((p): p is string => !!p))];
      if (places.length) {
        const pe = await wdGet(places, 'labels');
        for (const q of missing) {
          const p = wd[q]?.birthplaceId;
          if (p && pe[p]) wd[q].birthplace = pe[p].labels?.ru?.value ?? pe[p].labels?.en?.value ?? null;
        }
      }
      missing.forEach((q) => { if (wd[q]) cache[q] = { t: now, d: wd[q] }; });
      writeCache(cache);
    }
    return { wd, state: 'ok' };
  } catch (err) {
    console.warn('Викиданные недоступны:', err);
    return { wd, state: Object.keys(wd).length ? 'partial' : 'error' };
  }
}

// Вступление статьи русской Википедии (REST summary), один запрос на статью
interface WikiSummary { extract?: string }
const wikiCache = new Map<string, Promise<WikiSummary | null>>();
export function wikiSummary(title: string): Promise<WikiSummary | null> {
  if (!wikiCache.has(title)) {
    wikiCache.set(title, fetch(`https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
      .then((r) => (r.ok ? r.json() : null)).catch(() => null));
  }
  return wikiCache.get(title)!;
}
