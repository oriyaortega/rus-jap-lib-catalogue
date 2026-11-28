// Логика отдельных страниц: главная, переводчик, произведения, теги, профиль, книга
import { describe, expect, it } from 'vitest';
import { newestBooks, recentlyAdded } from './home';
import { ANON, translationsByAuthor } from './translator';
import { filterWorks, workComparator, workSortOf, workYear } from './works';
import { ALWAYS_TAGS, TYPE_TAGS, parseTags, tagCloud, tagCounts, toggleTag, tokenize } from './tags';
import { isRussianName, profileFacts, profileHeading } from './people';
import { bookSources, printRun } from './book';
import { CatalogModel } from './model';
import { book, books, catalog, wdPerson } from '../test/fixtures';
import type { PersonInfo } from '../types';

const ids = (l: { id: string }[]) => l.map((b) => b.id);
const bookNo = new Map(books.map((b, i) => [b.id, i + 1]));

describe('Главная', () => {
  it('последние добавления: по дате, при равной дате — более поздняя карточка', () => {
    expect(ids(recentlyAdded(books, bookNo, 3))).toEqual(['b5', 'b4', 'b3']);
  });
  it('новейшие издания: по году, без года — не показываются', () => {
    expect(ids(newestBooks(books, bookNo, 3))).toEqual(['b2', 'b1', 'b5']);
    expect(newestBooks(books, bookNo, 99).some((b) => !b.year)).toBe(false);
  });
});

describe('Переводы по авторам', () => {
  const sortOf = (id: string) => catalog.authors.find((a) => a.id === id)?.sort;
  it('в сборнике — только авторы, переведённые этим переводчиком; анонимные — в конце', () => {
    const groups = translationsByAuthor('markova', books.filter((b) => b.translators.includes('markova')), sortOf);
    expect(groups.map(([a, l]) => [a, ids(l)])).toEqual([['basho', ['b5']], [ANON, ['b5']]]);
  });
  it('обычные книги — по авторам книги, книги — по году', () => {
    const list = [book({ id: 'x2', authors: ['mishima'], year: 1994 }), book({ id: 'x1', authors: ['mishima', 'konrad'], year: 1990 })];
    expect(translationsByAuthor('t', list, sortOf).map(([a, l]) => [a, ids(l)])).toEqual([['konrad', ['x1']], ['mishima', ['x1', 'x2']]]);
  });
});

describe('Произведения', () => {
  const works = catalog.works!;
  const name = (id: string) => catalog.authors.find((a) => a.id === id)?.name_ru || id;
  it('поиск по названию, оригиналу и автору; фильтр по виду', () => {
    expect(filterWorks(works, 'храм', '', name).map((w) => w.id)).toEqual(['w1']);
    expect(filterWorks(works, 'мишима', '', name).map((w) => w.id)).toEqual(['w1', 'w2']);
    expect(filterWorks(works, '金閣', '', name).map((w) => w.id)).toEqual(['w1']);
    expect(filterWorks(works, '', 'роман', name).map((w) => w.id)).toEqual(['w1', 'w2', 'fw']);
  });
  it('сортировка по году: без года — в конце; неизвестная — без изменений', () => {
    const first = (w: { authors: string[] }) => w.authors[0];
    expect([...works].sort(workComparator('year', first)).map((w) => w.id)).toEqual(['w2', 'w1', 'fw', 'w3']);
    expect([...works].sort(workComparator('title', first)).map((w) => w.title_ru)).toEqual(['Золотой храм', 'Исповедь маски', 'Сёгун', 'Хайку']);
    expect([...works].sort(workComparator('???', first)).map((w) => w.id)).toEqual(works.map((w) => w.id));
  });
  it('направление: по убыванию меняется только основной ключ, без года — всё равно в конце', () => {
    const first = (w: { authors: string[] }) => w.authors[0];
    expect([...works].sort(workComparator('year', first, 'desc')).map((w) => w.id)).toEqual(['fw', 'w1', 'w2', 'w3']);
    expect([...works].sort(workComparator('title', first, 'desc')).map((w) => w.title_ru)).toEqual(['Хайку', 'Сёгун', 'Исповедь маски', 'Золотой храм']);
  });
  it('сортировка из адреса: по умолчанию — по алфавиту', () => {
    expect(workSortOf(null)).toBe('title');
    expect(workSortOf('year')).toBe('year');
    expect(workSortOf('publisher')).toBe('title');
  });
  it('год создания', () => {
    expect(workYear(1956)).toBe(1956);
    expect(workYear(-712)).toBe('712 до н. э.');
    expect(workYear(null)).toBe('—');
    expect(workYear(0)).toBe(0);
  });
});

describe('Теги', () => {
  it('разбор и переключение', () => {
    expect([...parseTags('манга,роман,')]).toEqual(['манга', 'роман']);
    expect(parseTags(null).size).toBe(0);
    expect(toggleTag('манга', 'роман')).toBe('манга,роман');
    expect(toggleTag('манга,роман', 'манга')).toBe('роман');
    expect(toggleTag(null, 'манга')).toBe('манга');
  });
  it('слова запроса', () => expect(tokenize('  Мураками   Харуки ')).toEqual(['Мураками', 'Харуки']));
  it('счётчики и облако: типовые теги отдельно, всегда видимые добавлены', () => {
    expect(tagCounts(books).get('переводная')).toBe(4);
    const cloud = tagCloud(books);
    expect(cloud.type).toEqual(TYPE_TAGS);
    for (const t of ALWAYS_TAGS) expect(cloud.other).toContain(t);
    expect(cloud.other).not.toContain('переводная');
    expect(cloud.other).toEqual([...cloud.other].sort((a, b) => a.localeCompare(b, 'ru')));
  });
});

describe('Профиль человека', () => {
  const m = new CatalogModel(catalog, {
    Q134456: wdPerson({ ru: 'Юкио Мисима', ja: '三島由紀夫', en: 'Yukio Mishima', kana: 'みしま ゆきお', born: { year: 1925, text: '14 января 1925' }, died: { year: 1970, text: '25 ноября 1970' }, birthplace: 'Токио' }),
    Q3737597: wdPerson({ ru: 'Конрад, Николай Иосифович', en: 'Nikolai Konrad' }),
    Q125663: wdPerson({ ru: 'Борис Акунин', en: 'Boris Akunin' }),
  }, 'ok');
  const keys = (p: PersonInfo) => profileFacts(p).map((f) => f.key);

  it('японский автор: имя по-русски, латиницей, по-японски с каной, годы, место рождения', () => {
    const p = m.authorInfo('mishima');
    expect(isRussianName(p)).toBe(false);
    expect(profileHeading(p)).toBe('Мисима Юкио');
    // имя в Викиданных содержит фамилию — строки «Также известен(а) как» нет
    expect(keys(p)).toEqual(['Имя на русском', 'Латиницей', 'По-японски', 'Годы жизни', 'Место рождения']);
    expect(profileFacts(p).find((f) => f.key === 'Годы жизни')).toEqual({ key: 'Годы жизни', text: '14 января 1925 – 25 ноября 1970' });
    expect(profileFacts(p).find((f) => f.key === 'По-японски')).toEqual({ key: 'По-японски', kanji: '三島由紀夫', kana: 'みしま ゆきお' });
  });
  it('русский автор: заголовок — полное имя, латиница не дублируется', () => {
    const p = m.authorInfo('konrad');
    expect(isRussianName(p)).toBe(true);
    expect(profileHeading(p)).toBe('Конрад Николай Иосифович');
    expect(keys(p)).not.toContain('Латиницей');
    expect(keys(p)).not.toContain('Имя на русском');
  });
  it('без full_name — полное имя из Викиданных в форме «Фамилия, Имя Отчество»', () => {
    const cat = { ...catalog, authors: [{ id: 'k', name_ru: 'Конрад Николай', sort: 'Конрад', name_orig: null, wikidata: 'Q3737597' }] };
    const mm = new CatalogModel(cat, { Q3737597: wdPerson({ ru: 'Конрад, Николай Иосифович' }) }, 'ok');
    expect(profileHeading(mm.authorInfo('k'))).toBe('Конрад Николай Иосифович');
  });
  it('псевдоним и иностранное имя в оригинале', () => {
    expect(profileFacts(m.authorInfo('eidus'))).toContainEqual({ key: 'Псевдоним', text: 'У. Хаяма' });
    expect(profileFacts(m.authorInfo('clavell'))).toContainEqual({ key: 'Имя в оригинале', text: 'James Clavell' });
  });
  it('переводчик с другим именем в Викиданных — «Также известен(а) как», без латиницы', () => {
    const f = profileFacts(m.translatorInfo('chkhartishvili'));
    expect(f).toContainEqual({ key: 'Также известен(а) как', text: 'Борис Акунин' });
    expect(f.map((x) => x.key)).not.toContain('Латиницей');
  });
});

describe('Страница книги', () => {
  it('источники: основная ссылка, ссылки, ключи и текст; повтор основной убирается', () => {
    const b = book({ id: 'x', source: 'https://fantlab.ru/edition1', sources: ['fantlab', 'livelib', 'Библиография Японии, № 5'], links: [{ name: 'PDF', url: 'https://sengoku.ru/x.pdf' }] });
    expect(bookSources(b)).toEqual([
      { href: 'https://fantlab.ru/edition1', text: 'Фантлаб' },
      { href: 'https://sengoku.ru/x.pdf', text: 'PDF' },
      { text: 'LiveLib' },
      { text: 'Библиография Японии, № 5' },
    ]);
  });
  it('без источников — строки нет; пустой список — строка есть, но пустая', () => {
    expect(bookSources(book({ id: 'x' }))).toBeNull();
    expect(bookSources(book({ id: 'x', sources: [] }))).toEqual([]);
  });
  it('тираж', () => expect(printRun(100000).replace(/\s/g, ' ')).toBe('100 000 экз.'));
});
