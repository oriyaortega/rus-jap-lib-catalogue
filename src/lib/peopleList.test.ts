import { describe, expect, it } from 'vitest';
import { peopleDefaultOrder, peopleSortOf, sortPeopleBy } from './peopleList';
import type { PersonInfo, WdPerson } from '../types';

const wd = (born: number | null): WdPerson => ({
  ru: null, ja: null, en: null, kana: null, born: born == null ? null : { year: born, text: String(born) } as WdPerson['born'],
  died: null, birthplaceId: null, birthplace: null, image: null, ruwiki: null, jawiki: null, aliases: [],
});
const person = (id: string, name: string, extra: Partial<PersonInfo> = {}): PersonInfo => ({
  id, kind: 'author', name_ru: name, sort: name, w: null, kanji: null, orig: name, ...extra,
});

const a = person('a', 'Акутагава Рюноскэ', { kanji: '芥川龍之介', orig: '芥川龍之介', w: wd(1892) });
const b = person('b', 'Басё', { w: wd(1644) });
const c = person('c', 'Вишневский В.');
const alias = { ...person('b', 'Мацуо Мунэфуса'), aliasOf: b };
const books: Record<string, number> = { a: 50, b: 10, c: 50 };

describe('Перечни людей', () => {
  it('сортировка из адреса и направление по умолчанию', () => {
    expect(peopleSortOf(null)).toBe('name');
    expect(peopleSortOf('books')).toBe('books');
    expect(peopleSortOf('xx')).toBe('name');
    expect(peopleDefaultOrder('books')).toBe('desc');
    expect(peopleDefaultOrder('born')).toBe('asc');
  });

  it('по алфавиту — с отсылками, в обе стороны', () => {
    expect(sortPeopleBy([c, alias, a, b], 'name', 'asc', () => 0).map((p) => p.name_ru)).toEqual(['Акутагава Рюноскэ', 'Басё', 'Вишневский В.', 'Мацуо Мунэфуса']);
    expect(sortPeopleBy([c, a, b], 'name', 'desc', () => 0).map((p) => p.id)).toEqual(['c', 'b', 'a']);
  });

  it('по числу изданий и году рождения — без отсылок; равные и без года — по алфавиту, в конце', () => {
    const n = (p: PersonInfo) => books[p.id];
    expect(sortPeopleBy([b, c, alias, a], 'books', 'desc', n).map((p) => p.id)).toEqual(['a', 'c', 'b']);
    expect(sortPeopleBy([c, a, b], 'born', 'asc', n).map((p) => p.id)).toEqual(['b', 'a', 'c']);
    expect(sortPeopleBy([c, a, b], 'born', 'desc', n).map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
});
