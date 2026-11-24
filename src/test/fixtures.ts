// Небольшой каталог для тестов логики
import type { Author, Book, Catalog, Translator, WdPerson } from '../types';

export function book(p: Partial<Book> & { id: string }): Book {
  return {
    title_ru: p.id, title_orig: null, title_romaji: null, authors: [], translators: [], year: null, city: null,
    publisher: null, pages: null, genre: 'роман', orig_year: null, tags: [], ...p,
  };
}

export function wdPerson(p: Partial<WdPerson> = {}): WdPerson {
  return {
    ru: null, ja: null, en: null, kana: null, born: null, died: null, birthplaceId: null, birthplace: null,
    image: null, ruwiki: null, jawiki: null, aliases: [], ...p,
  };
}

export const authors: Author[] = [
  { id: 'mishima', name_ru: 'Мисима Юкио', sort: 'Мисима', wikidata: 'Q134456' },
  { id: 'konrad', name_ru: 'Конрад Николай', sort: 'Конрад', name_orig: null, full_name: 'Конрад Николай Иосифович', wikidata: 'Q3737597' },
  { id: 'eidus', name_ru: 'Эйдус Хаим', sort: 'Эйдус', name_orig: null, pseudonym: 'У. Хаяма', aliases: [{ name_ru: 'Хаяма У.', sort: 'Хаяма' }] },
  { id: 'basho', name_ru: 'Басё', sort: 'Басё', name_orig: '松尾芭蕉', era: 'Эдо' },
  { id: 'clavell', name_ru: 'Клавелл Джеймс', sort: 'Клавелл', name_orig: 'James Clavell' },
  { id: 'erokhin', name_ru: 'Ёрохин Пётр', sort: 'Ёрохин', name_orig: null },
];

export const translators: Translator[] = [
  { id: 'markova', name_ru: 'Маркова Вера', short: 'В. Маркова', sort: 'Маркова' },
  { id: 'chkhartishvili', name_ru: 'Чхартишвили Григорий', short: 'Г. Чхартишвили', sort: 'Чхартишвили', wikidata: 'Q125663' },
];

export const books: Book[] = [
  book({ id: 'b1', title_ru: 'Золотой храм', title_orig: '金閣寺', authors: ['mishima'], translators: ['chkhartishvili'], year: 1993, publisher: 'Северо-Запад', city: 'Санкт-Петербург', tags: ['художественная', 'переводная', 'Сёва'], added: '2026-11-08' }),
  book({ id: 'b2', title_ru: '«Исповедь маски»', authors: ['mishima'], year: 1994, publisher: 'Азбука', city: 'Москва', tags: ['художественная', 'переводная'], added: '2026-11-08' }),
  book({ id: 'b3', title_ru: 'Япония. Народ и государство', authors: ['konrad'], year: 1923, genre: 'история', city: 'Петроград', tags: ['нехудожественная', 'на русском', 'история'], added: '2026-11-09' }),
  book({ id: 'b4', title_ru: 'Япония', authors: ['eidus'], year: 1938, genre: 'исследование', publisher: 'Соцэкгиз', tags: ['нехудожественная', 'на русском', 'политика'], added: '2026-11-23' }),
  book({ id: 'b5', title_ru: 'Стихи', authors: [], translators: ['markova'], year: 1985, genre: 'поэзия', tags: ['художественная', 'переводная'],
    contents: [{ a: 'basho', t: 'Хайку', tr: ['markova'] }, { a: null, t: 'Народные песни', tr: ['markova'] }, { a: 'basho', tr: ['markova'] }], added: '2026-11-23' }),
  book({ id: 'b6', title_ru: 'Сёгун', authors: ['clavell'], year: null, genre: 'роман', series: { id: 's1', no: 2 }, tags: ['художественная', 'переводная'] }),
  book({ id: 'b7', title_ru: 'Японский дом', authors: ['eidus'], year: 1938, genre: 'исследование', hide_on_author: true, tags: ['нехудожественная'] }),
];

export const catalog: Catalog = {
  authors, translators, books, news: [],
  series: [{ id: 's1', name: 'Азбука-бестселлер', publisher: 'Азбука', city: 'Москва', years: '2000–' }],
  works: [
    { id: 'w1', authors: ['mishima'], title_ru: 'Золотой храм', title_orig: '金閣寺', kind: 'роман', year: 1956, fantlab: 1 },
    { id: 'w2', authors: ['mishima'], title_ru: 'Исповедь маски', kind: 'роман', year: 1949 },
    { id: 'w3', authors: ['basho'], title_ru: 'Хайку', kind: 'стихотворение', year: null },
    { id: 'fw', authors: ['clavell'], title_ru: 'Сёгун', title_orig: 'Shōgun', kind: 'роман', year: 1975, foreign: true, lang: 'английский', books: ['b6'] },
  ],
};
