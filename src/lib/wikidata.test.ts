// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadWikidata, parseEntity, wdDate, wikiSummary, type WdEntity } from './wikidata';
import type { Catalog } from '../types';

describe('wdDate', () => {
  it('точность до дня — число, месяц, год', () => {
    expect(wdDate({ time: '+1925-01-14T00:00:00Z', precision: 11 })).toEqual({ year: 1925, text: '14 января 1925' });
  });
  it('точность до года', () => expect(wdDate({ time: '+1644-00-00T00:00:00Z', precision: 9 })).toEqual({ year: 1644, text: '1644' }));
  it('грубее года — «ок.»', () => expect(wdDate({ time: '+0966-00-00T00:00:00Z', precision: 8 })).toEqual({ year: 966, text: 'ок. 966' }));
  it('до нашей эры', () => expect(wdDate({ time: '-0551-00-00T00:00:00Z', precision: 9 })).toEqual({ year: -551, text: '551 до н. э.' }));
  it('нет значения', () => {
    expect(wdDate(null)).toBeNull();
    expect(wdDate({ time: 'мусор' })).toBeNull();
  });
});

const mishima: WdEntity = {
  labels: { ru: { value: 'Юкио Мисима' }, ja: { value: '三島由紀夫' }, en: { value: 'Yukio Mishima' } },
  aliases: { ru: [{ value: 'Мисима Юкио' }], en: [{ value: 'Kimitake Hiraoka' }] },
  claims: {
    P18: [{ mainsnak: { datavalue: { value: 'Yukio Mishima 1955.jpg' } } }],
    P1814: [{ mainsnak: { datavalue: { value: 'みしま ゆきお' } } }],
    P569: [{ mainsnak: { datavalue: { value: { time: '+1925-01-14T00:00:00Z', precision: 11 } } } }],
    P570: [{ mainsnak: { datavalue: { value: { time: '+1970-11-25T00:00:00Z', precision: 11 } } } }],
    P19: [{ mainsnak: { datavalue: { value: { id: 'Q1490' } } } }],
  },
  sitelinks: { ruwiki: { title: 'Мисима, Юкио' }, jawiki: { title: '三島由紀夫' } },
};

describe('parseEntity', () => {
  it('имена, кана, даты, место рождения, портрет, статьи', () => {
    const p = parseEntity(mishima);
    expect(p).toMatchObject({
      ru: 'Юкио Мисима', ja: '三島由紀夫', en: 'Yukio Mishima', kana: 'みしま ゆきお',
      born: { year: 1925, text: '14 января 1925' }, died: { year: 1970 },
      birthplaceId: 'Q1490', birthplace: null, ruwiki: 'Мисима, Юкио', jawiki: '三島由紀夫',
      aliases: ['Мисима Юкио', 'Kimitake Hiraoka'],
    });
    expect(p.image).toBe('https://commons.wikimedia.org/wiki/Special:FilePath/Yukio%20Mishima%201955.jpg?width=240');
  });
  it('пустой элемент', () => {
    expect(parseEntity({})).toMatchObject({ ru: null, born: null, image: null, aliases: [] });
  });
});

describe('loadWikidata', () => {
  const catalog = {
    authors: [{ id: 'mishima', name_ru: 'Мисима Юкио', sort: 'Мисима', wikidata: 'Q134456' }, { id: 'x', name_ru: 'X', sort: 'X' }],
    translators: [{ id: 't', name_ru: 'T', sort: 'T', wikidata: 'Q134456' }],
    books: [], news: [], series: [],
  } as Catalog;

  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('запрашивает людей и места рождения, кэширует результат', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const ids = new URL(url).searchParams.get('ids');
      const entities = ids === 'Q134456' ? { Q134456: mishima } : { Q1490: { labels: { ru: { value: 'Токио' } } } };
      return new Response(JSON.stringify({ entities }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const { wd, state } = await loadWikidata(catalog);
    expect(state).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);   // один QID на двоих, затем место рождения
    expect(wd.Q134456.birthplace).toBe('Токио');
    expect(JSON.parse(localStorage.getItem('wd-cache-v2')!).Q134456.d.ru).toBe('Юкио Мисима');

    // второй раз — из кэша, без запросов
    fetchMock.mockClear();
    const again = await loadWikidata(catalog);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(again.wd.Q134456.birthplace).toBe('Токио');
  });

  it('устаревший кэш перезапрашивается', async () => {
    localStorage.setItem('wd-cache-v2', JSON.stringify({ Q134456: { t: Date.now() - 8 * 24 * 3600 * 1000, d: { ru: 'старое' } } }));
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ entities: { Q134456: { labels: { ru: { value: 'новое' } } } } }))));
    const { wd } = await loadWikidata(catalog);
    expect(wd.Q134456.ru).toBe('новое');
  });

  it('ошибка сети: из кэша — partial, без кэша — error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await loadWikidata(catalog)).state).toBe('error');
    localStorage.setItem('wd-cache-v2', JSON.stringify({ Q134456: { t: 0, d: { ru: 'кэш' } } }));
    const r = await loadWikidata(catalog);
    expect(r.state).toBe('partial');
    expect(r.wd.Q134456.ru).toBe('кэш');
  });

  it('больше 50 QID — несколько запросов', async () => {
    const many = { ...catalog, translators: [], authors: Array.from({ length: 120 }, (_, i) => ({ id: `a${i}`, name_ru: 'A', sort: 'A', wikidata: `Q${i + 1}` })) } as Catalog;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ entities: {} })));
    vi.stubGlobal('fetch', fetchMock);
    await loadWikidata(many);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('wikiSummary', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('один запрос на статью, ошибка — null', async () => {
    const fetchMock = vi.fn(async (url: string) => (url.includes('%D0%9A') ? new Response(JSON.stringify({ extract: 'Текст' })) : new Response('', { status: 404 })));
    vi.stubGlobal('fetch', fetchMock);
    expect(await wikiSummary('Конрад')).toEqual({ extract: 'Текст' });
    expect(await wikiSummary('Конрад')).toEqual({ extract: 'Текст' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await wikiSummary('Нет такой')).toBeNull();
  });
});
