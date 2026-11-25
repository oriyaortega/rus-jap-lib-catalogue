import { describe, expect, it } from 'vitest';
import { catalogBooksOfWork, contentWorks, editionsOf, itemAuthor, origKey, publicationText, sortPublications, translatorIndex, workTranslatorIds } from './workPage';
import { book, catalog, translators } from '../test/fixtures';
import type { Book, Work, WorkPublication } from '../types';

const ids = (l: { id: string }[]) => l.map((b) => b.id);
const work = (over: Partial<Work>): Work => ({ id: 'w', authors: [], title_ru: '', ...over });
const lib = [
  book({ id: 'k1', title_ru: 'Золотой храм', title_orig: '金閣寺', authors: ['mishima'], translators: ['chkhartishvili'], year: 1993 }),
  book({ id: 'k2', title_ru: '«Золотой храм»', authors: ['mishima'], translators: ['markova'], year: 1981 }),
  book({ id: 'k3', title_ru: 'Избранное', authors: ['mishima'], translators: ['markova', 'chkhartishvili'], year: 2000,
    contents: [{ a: 'mishima', t: 'Золотой храм', tr: ['markova'] }, { a: 'mishima', t: 'Патриотизм', tr: ['chkhartishvili'] }] }),
  book({ id: 'k4', title_ru: 'Золотой храм', authors: ['kawabata'], year: 1990 }),
  book({ id: 'k5', title_ru: 'Антология', authors: [], year: 1970, contents: [{ a: 'mishima', o: '金閣寺', t: 'Храм', tr: [] }] }),
];
const byAuthor = (a: string) => lib.filter((b) => b.authors.includes(a) || (b.contents || []).some((c) => c.a === a));
const byId = (id: string) => lib.find((b) => b.id === id);

describe('origKey', () => {
  it('без латиницы после « / » и без пробелов', () => {
    expect(origKey('風の歌を聴け / Kaze no uta wo kike')).toBe('風の歌を聴け');
    expect(origKey(' 金閣 寺 ')).toBe('金閣寺');
    expect(origKey(null)).toBe('');
  });
});

describe('catalogBooksOfWork', () => {
  const w = work({ authors: ['mishima'], title_ru: 'Золотой храм', title_orig: '金閣寺' });
  it('по оригиналу, русскому названию (без кавычек) и содержанию сборников; чужой автор не подходит; по году', () => {
    expect(ids(catalogBooksOfWork(w, byAuthor, byId))).toEqual(['k5', 'k2', 'k1', 'k3']);
  });
  it('книги из поля books и сопоставленные издания Фантлаба, без повторов', () => {
    const pubs: WorkPublication[] = [{ fl: 1, title: 'x', kind: 'книга', book: 'k4' }, { fl: 2, title: 'y', kind: 'книга', book: 'k1' }];
    expect(ids(catalogBooksOfWork(work({ authors: ['x'], title_ru: 'Нет', books: ['k2'] }), byAuthor, byId, pubs))).toEqual(['k2', 'k4', 'k1']);
  });
  it('часть составного названия книги — тоже это произведение', () => {
    const more = [...lib, book({ id: 'k6', title_ru: 'Золотой храм. Патриотизм', authors: ['mishima'], year: 2010 }), book({ id: 'k7', title_ru: 'Храмы Киото', title_orig: '金閣寺・銀閣寺', authors: ['mishima'], year: 2011 })];
    const found = catalogBooksOfWork(w, (a) => more.filter((b) => b.authors.includes(a)), byId);
    expect(ids(found)).toEqual(['k2', 'k1', 'k3', 'k6', 'k7']);
  });
  it('без автора — по всему каталогу, в том числе по содержанию', () => {
    const anon = work({ title_ru: 'Повесть о старике Такэтори', title_orig: '竹取物語' });
    const all = [book({ id: 'a1', title_ru: 'Волшебные повести. Повесть о старике Такэтори.— Повесть о прекрасной Отикубо', year: 1976 }),
      book({ id: 'a2', title_ru: 'Повести', title_orig: '竹取物語・落窪物語', authors: ['nijo'], year: 1988 }),
      book({ id: 'a3', title_ru: 'Сказки', year: 1960, contents: [{ a: null, t: 'Повесть о старике Такэтори', tr: [] }] }), book({ id: 'a4', title_ru: 'Другое', year: 1950 })];
    expect(ids(catalogBooksOfWork(anon, () => [], () => undefined, [], all))).toEqual(['a3', 'a1', 'a2']);
  });
  it('ничего не нашлось', () => {
    expect(catalogBooksOfWork(work({ authors: ['mishima'], title_ru: 'Весенний снег' }), byAuthor, byId)).toEqual([]);
  });
});

describe('workTranslatorIds', () => {
  const w = work({ authors: ['mishima'], title_ru: 'Золотой храм', title_orig: '金閣寺', translators: ['basho-tr'] });
  it('из поля translators, отдельных изданий и содержания сборников (только этого произведения)', () => {
    const books = [lib[0], lib[2]] as Book[];
    expect(workTranslatorIds(w, books)).toEqual(['basho-tr', 'chkhartishvili', 'markova']);
  });
});

describe('translatorIndex', () => {
  it('имя с Фантлаба в другом порядке слов и с ё', () => {
    const find = translatorIndex(translators);
    expect(find('Григорий Чхартишвили')?.id).toBe('chkhartishvili');
    expect(find('Вера  Маркова')?.id).toBe('markova');
    expect(find('Иван Иванов')).toBeUndefined();
  });
});

describe('публикации', () => {
  const pubs: WorkPublication[] = [
    { fl: 3, title: 'Б', kind: 'книга' }, { fl: 1, title: 'Б', kind: 'журнал', year: 2001 }, { fl: 2, title: 'А', kind: 'книга', year: 2001, publisher: 'Эксмо', pages: 300 },
  ];
  it('по году, без года — в конце, затем по названию', () => {
    expect(sortPublications(pubs).map((p) => p.fl)).toEqual([2, 1, 3]);
    expect(pubs[0].fl).toBe(3);
  });
  it('выходные данные', () => {
    expect(publicationText(pubs[2])).toBe('Эксмо, 2001, 300 с.');
    expect(publicationText(pubs[0])).toBe('');
  });
  it('данные для произведения', () => {
    const w = catalog.works![0];
    expect(editionsOf(null, w)).toBeNull();
    expect(editionsOf({ [w.id]: { pubs: [] } }, w)).toEqual({ pubs: [] });
    expect(editionsOf({}, w)).toBeNull();
  });
});

describe('contentWorks: произведения для содержания сборников', () => {
  const works = [work({ id: 'w1', authors: ['mishima'], title_ru: 'Золотой храм', title_orig: '金閣寺' }), work({ id: 'xw', title_ru: 'Повесть о старике Такэтори', title_orig: '竹取物語' })];
  const b1 = book({ id: 'c1', authors: [], contents: [
    { a: 'mishima', t: 'Храм', o: '金閣寺', tr: [] },          // по оригиналу
    { t: '«Повесть о старике Такэтори»', tr: [] },            // анонимное, по названию без кавычек
    { a: 'mishima', t: 'Патриотизм', k: 'рассказ', tr: [] },  // нет в works
    { a: 'mishima', tr: [] },                                 // без названия
  ] });
  const b2 = book({ id: 'c2', authors: ['mishima'], contents: [{ t: 'Патриотизм', tr: [] }, { a: 'kawabata', t: 'Патриотизм', tr: [] }] });
  const { byItem, derived } = contentWorks([b1, b2], works);
  it('пункты находят произведения из works', () => {
    expect(byItem.get(b1.contents![0])?.id).toBe('w1');
    expect(byItem.get(b1.contents![1])?.id).toBe('xw');
  });
  it('остальные — новые произведения, одно на автора и название; без названия — ничего', () => {
    expect(derived.map((w) => w.id)).toEqual(['c-c1-3', 'c-c2-2']);
    expect(derived[0]).toMatchObject({ authors: ['mishima'], title_ru: 'Патриотизм', kind: 'рассказ', derived: true });
    expect(byItem.get(b2.contents![0])).toBe(derived[0]);  // автор не указан — единственный автор книги
    expect(byItem.get(b2.contents![1])?.authors).toEqual(['kawabata']);
    expect(byItem.has(b1.contents![3])).toBe(false);
  });
  it('itemAuthor', () => {
    expect(itemAuthor(b2, b2.contents![0])).toBe('mishima');
    expect(itemAuthor(b1, b1.contents![1])).toBeNull();
  });
  it('страница такого произведения находит сборники', () => {
    const all = [b1, b2];
    const found = catalogBooksOfWork(derived[0], (a) => all.filter((b) => b.authors.includes(a) || (b.contents || []).some((c) => c.a === a)), () => undefined);
    expect(found.map((b) => b.id)).toEqual(['c1', 'c2']);
  });
});
