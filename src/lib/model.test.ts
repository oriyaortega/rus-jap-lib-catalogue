import { describe, expect, it } from 'vitest';
import { CatalogModel } from './model';
import { OTHER_COLOR, TRANSLATOR_COLOR, ERA_COLORS } from './colors';
import { catalog, wdPerson } from '../test/fixtures';

const wd = {
  Q134456: wdPerson({ ru: 'Юкио Мисима', ja: '三島由紀夫', en: 'Yukio Mishima', kana: 'みしま', born: { year: 1925, text: '1925' }, aliases: ['Hiraoka'] }),
  Q3737597: wdPerson({ ru: 'Николай Конрад', ja: 'ニコライ・コンラド', born: { year: 1891, text: '1891' } }),
  Q125663: wdPerson({ ru: 'Борис Акунин', en: 'Boris Akunin' }),
};
const m = new CatalogModel(catalog, wd, 'ok');
const ids = (books: { id: string }[]) => books.map((b) => b.id);

describe('индексы', () => {
  it('номер карточки — позиция в каталоге', () => {
    expect(m.bookNo.get('b1')).toBe(1);
    expect(m.bookNo.get('b7')).toBe(7);
  });
  it('книги автора: как автор и как автор произведения в сборнике, один раз', () => {
    expect(ids(m.booksOf('mishima'))).toEqual(['b1', 'b2']);
    expect(ids(m.booksOf('basho'))).toEqual(['b5']);
    expect(m.booksOf('nobody')).toEqual([]);
  });
  it('переводы и произведения', () => {
    expect(ids(m.translationsOf('markova'))).toEqual(['b5']);
    expect(m.worksOf('mishima').map((w) => w.id)).toEqual(['w1', 'w2']);
  });
  it('серия книги', () => {
    expect(m.seriesOf(m.book('b6')!)?.name).toBe('Азбука-бестселлер');
    expect(m.seriesOf(m.book('b1')!)).toBeNull();
  });
});

describe('authorInfo', () => {
  it('японское имя из Викиданных, если name_orig не указан', () => {
    const p = m.authorInfo('mishima');
    expect(p).toMatchObject({ kind: 'author', kanji: '三島由紀夫', orig: '三島由紀夫' });
    expect(p.w?.en).toBe('Yukio Mishima');
  });
  it('name_orig: null — японского имени нет, даже если в Викиданных есть метка ja', () => {
    expect(m.authorInfo('konrad')).toMatchObject({ kanji: null, orig: 'Конрад Николай' });
  });
  it('латинское name_orig — не иероглифы', () => {
    expect(m.authorInfo('clavell')).toMatchObject({ kanji: null, orig: 'James Clavell' });
  });
  it('неизвестный id — запись-заглушка', () => {
    expect(m.authorInfo('zzz')).toMatchObject({ id: 'zzz', name_ru: 'zzz', kind: 'author', w: null });
  });
  it('переводчик: orig — русское имя', () => {
    expect(m.translatorInfo('chkhartishvili')).toMatchObject({ kind: 'translator', orig: 'Чхартишвили Григорий', kanji: null });
    expect(m.translatorInfo('chkhartishvili').w?.ru).toBe('Борис Акунин');
  });
  it('псевдонимы — отдельные записи со ссылкой на автора', () => {
    const [al] = m.aliasEntries();
    expect(al).toMatchObject({ id: 'eidus', name_ru: 'Хаяма У.', sort: 'Хаяма', kanji: null, w: null });
    expect(al.aliasOf?.name_ru).toBe('Эйдус Хаим');
  });
});

describe('цвета карточек людей', () => {
  it('явная эпоха', () => expect(m.eraOf('basho')).toBe('Эдо'));
  it('по году рождения — только у японцев (есть name_orig)', () => {
    // у Мисимы name_orig не задан — год рождения не используется, эпоха — по тегам книг
    expect(m.eraOf('mishima')).toBe('Сёва');
    expect(m.eraOf('konrad')).toBeNull();
  });
  it('цвет: переводчик, эпоха, неяпонец', () => {
    expect(m.personColor(m.translatorInfo('markova'))).toBe(TRANSLATOR_COLOR);
    expect(m.personColor(m.authorInfo('basho'))).toBe(ERA_COLORS['Эдо'][0]);
    expect(m.personColor(m.authorInfo('clavell'))).toBe(OTHER_COLOR);
  });
  it('японец с годом рождения в Викиданных', () => {
    const cat = { ...catalog, authors: [{ id: 'a', name_ru: 'Кавабата Ясунари', sort: 'Кавабата', name_orig: '川端康成', wikidata: 'Q1' }] };
    const mm = new CatalogModel(cat, { Q1: wdPerson({ born: { year: 1899, text: '1899' } }) }, 'ok');
    expect(mm.eraOf('a')).toBe('Тайсё');
  });
});

describe('поиск', () => {
  const search = (q: string) => catalog.books.filter((b) => m.matches(b, q.split(' ').filter(Boolean))).map((b) => b.id);
  it('по названию, автору, переводчику, издательству', () => {
    expect(search('храм')).toEqual(['b1']);
    expect(search('мисима')).toEqual(['b1', 'b2']);
    expect(search('Mishima')).toEqual(['b1', 'b2']);
    expect(search('Акунин')).toEqual(['b1']);
    expect(search('азбука')).toEqual(['b2', 'b6']);   // издательство и серия
  });
  it('транслитерация: Мишима = Мисима, иероглифы', () => {
    expect(search('Мишима')).toEqual(['b1', 'b2']);
    expect(search('金閣寺')).toEqual(['b1']);
    expect(search('三島')).toEqual(['b1', 'b2']);
  });
  it('по содержанию сборника и всем словам сразу', () => {
    expect(search('хайку')).toEqual(['b5']);
    expect(search('мисима маски')).toEqual(['b2']);
  });
  it('пустой запрос — все книги', () => expect(search('')).toHaveLength(catalog.books.length));
});

describe('сортировки книг', () => {
  const sorted = (k: keyof typeof m.bookSorts) => ids([...catalog.books].sort(m.bookSorts[k]));
  it('по автору: книги без автора — в конце', () => {
    expect(sorted('author')).toEqual(['b6', 'b3', 'b1', 'b2', 'b4', 'b7', 'b5']);
  });
  it('по названию: кавычки в начале не учитываются', () => {
    expect(sorted('title')).toEqual(['b1', 'b2', 'b6', 'b5', 'b4', 'b3', 'b7']);
  });
  it('по году: без года — в конце', () => {
    expect(sorted('year')).toEqual(['b3', 'b4', 'b7', 'b5', 'b1', 'b2', 'b6']);
  });
  it('по издательству: без издательства — в конце', () => {
    expect(sorted('publisher').slice(0, 3)).toEqual(['b2', 'b1', 'b4']);
  });
});
