import { describe, expect, it } from 'vitest';
import {
  type EditionKeys, type EditionSort, type SortOrder, authorWorks, defaultOrder, editionComparator, editionGroupOf, editionOrderOf, editionSortOf, booksOfYear,
  editionGroupId, flipOrder, groupRuns, letterOf, letterRuns, sortPeople,
} from './grouping';
import { authors, book, books, catalog } from '../test/fixtures';
import { titleKey } from './text';

const ids = (l: { id: string }[]) => l.map((b) => b.id);

describe('groupRuns', () => {
  it('подряд идущие одинаковые ключи — одна группа, порядок сохраняется', () => {
    expect(groupRuns(['аб', 'ав', 'ба', 'аа'], (s) => s[0])).toEqual([['а', ['аб', 'ав']], ['б', ['ба']], ['а', ['аа']]]);
    expect(groupRuns([], (s: string) => s)).toEqual([]);
  });
});

describe('люди по алфавиту', () => {
  it('Ё после Е, при равной фамилии — по имени', () => {
    const people = [
      { sort: 'Ёрохин', name_ru: 'Ёрохин Пётр' }, { sort: 'Ершов', name_ru: 'Ершов Б' }, { sort: 'Ершов', name_ru: 'Ершов А' }, { sort: 'Абэ', name_ru: 'Абэ Кобо' },
    ];
    expect(sortPeople(people).map((p) => p.name_ru)).toEqual(['Абэ Кобо', 'Ершов А', 'Ершов Б', 'Ёрохин Пётр']);
    expect(letterOf({ sort: 'ёрохин' })).toBe('Ё');
  });
});

describe('authorWorks: книги автора по произведениям', () => {
  const list = [
    book({ id: 'k2', title_ru: 'Япония', title_orig: null, year: 1945 }),
    book({ id: 'k1', title_ru: '«Золотой храм»', title_orig: '金閣寺', year: 1993 }),
    book({ id: 'k3', title_ru: 'Золотой храм', title_orig: '金閣寺', year: 1981 }),
    book({ id: 'k4', title_ru: 'Япония', year: 1938 }),
    book({ id: 'k5', title_ru: 'Абрис', year: 2000, hide_on_author: true }),
    book({ id: 'k6', title_ru: 'Белый', year: null }),
  ];
  it('одно произведение — издания с одним оригинальным (или русским) названием, по году', () => {
    const works = authorWorks(list);
    expect(works.map(ids)).toEqual([['k6'], ['k3', 'k1'], ['k4', 'k2']]);
  });
  it('по алфавиту названия первого издания, кавычки не учитываются; скрытые пропускаются', () => {
    expect(authorWorks(list).map((w) => w[0].title_ru)).toEqual(['Белый', 'Золотой храм', 'Япония']);
  });
  it('исходный список не меняется', () => {
    const copy = [...list];
    authorWorks(list);
    expect(list).toEqual(copy);
  });
});

describe('Издания', () => {
  it('фильтр по году и «до 1950»', () => {
    expect(ids(booksOfYear(books, '1938'))).toEqual(['b4', 'b7']);
    expect(ids(booksOfYear(books, 'early'))).toEqual(['b3', 'b4', 'b7']);
    expect(booksOfYear(books, undefined)).toHaveLength(books.length);
    expect(booksOfYear(books, '1800')).toEqual([]);
  });
  const keys: EditionKeys = {
    bookNo: new Map(books.map((b, i) => [b.id, i + 1])),
    authorSort: (b) => authors.find((a) => a.id === b.authors[0])?.sort || '',
    seriesName: (b) => catalog.series.find((x) => x.id === b.series?.id)?.name || '',
  };
  const sorted = (s: EditionSort, o: SortOrder) => ids([...books].sort(editionComparator(s, o, keys)));
  const groupsOf = (s: EditionSort, o: SortOrder) => groupRuns([...books].sort(editionComparator(s, o, keys)), editionGroupOf(s, keys)).map(([g]) => g);

  it('группы по первой букве: латиница и цифры — отдельно', () => {
    const g = editionGroupOf('title', keys);
    expect(g(book({ id: 'a', title_ru: '«Ёжик»' }))).toBe('Ё');
    expect(g(book({ id: 'a', title_ru: 'Shogun' }))).toBe('A–Z');
    expect(g(book({ id: 'a', title_ru: '1Q84' }))).toBe('0–9');
    expect(g(book({ id: 'a', title_ru: '' }))).toBe('?');
    expect(editionGroupOf('year', keys)(book({ id: 'a' }))).toBe('год не указан');
    expect(editionGroupOf('publisher', keys)(book({ id: 'a' }))).toBe('издательство не указано');
  });
  it('по алфавиту: по возрастанию и убыванию', () => {
    expect(sorted('title', 'asc')).toEqual(['b1', 'b2', 'b6', 'b5', 'b4', 'b3', 'b7']);
    expect(sorted('title', 'desc')).toEqual(['b7', 'b3', 'b4', 'b5', 'b6', 'b2', 'b1']);
    expect(groupsOf('title', 'desc')).toEqual(['Я', 'С', 'И', 'З']);
  });
  it('по году: книги без года — в конце в обоих направлениях, один год — по алфавиту', () => {
    expect(sorted('year', 'asc')).toEqual(['b3', 'b4', 'b7', 'b5', 'b1', 'b2', 'b6']);
    expect(sorted('year', 'desc')).toEqual(['b2', 'b1', 'b5', 'b4', 'b7', 'b3', 'b6']);
  });
  it('по издательству: без издательства — в конце, внутри издательства — по году', () => {
    expect(sorted('publisher', 'asc')).toEqual(['b2', 'b1', 'b4', 'b6', 'b3', 'b7', 'b5']);
    expect(sorted('publisher', 'desc')).toEqual(['b4', 'b1', 'b2', 'b6', 'b3', 'b7', 'b5']);
  });
  it('по автору: по фамилии первого автора, без автора — в конце; группы по букве', () => {
    expect(sorted('author', 'asc')).toEqual(['b6', 'b3', 'b1', 'b2', 'b4', 'b7', 'b5']);
    expect(sorted('author', 'desc')).toEqual(['b4', 'b7', 'b1', 'b2', 'b3', 'b6', 'b5']);
    expect(groupsOf('author', 'asc')).toEqual(['К', 'М', 'Э', 'автор не указан']);
  });
  it('по серии: книги вне серий — в конце', () => {
    expect(sorted('series', 'asc')).toEqual(['b6', 'b1', 'b2', 'b5', 'b4', 'b3', 'b7']);
    expect(sorted('series', 'desc')[0]).toBe('b6');
    expect(groupsOf('series', 'asc')).toEqual(['«Азбука-бестселлер»', 'вне серий']);
  });
  it('по дате добавления — по номеру карточки; группы по дате', () => {
    expect(sorted('added', 'desc')).toEqual(['b7', 'b6', 'b5', 'b4', 'b3', 'b2', 'b1']);
    expect(sorted('added', 'asc')).toEqual(['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7']);
    expect(editionGroupOf('added', keys)(book({ id: 'a', added: '2026-11-23' }))).toBe('добавлены 23 ноября 2026');
    expect(editionGroupOf('added', keys)(book({ id: 'a' }))).toBe('дата добавления не указана');
  });
  it('параметры сортировки и направления', () => {
    expect(editionSortOf('added')).toBe('added');
    expect(editionSortOf('series')).toBe('series');
    expect(editionSortOf('author')).toBe('author');
    expect(editionSortOf('kind')).toBe('title');
    expect(editionSortOf(null)).toBe('title');
    expect(defaultOrder('added')).toBe('desc');
    expect(defaultOrder('year')).toBe('asc');
    expect(editionOrderOf('added', null)).toBe('desc');
    expect(editionOrderOf('title', 'desc')).toBe('desc');
    expect(editionOrderOf('title', 'up')).toBe('asc');
    expect(flipOrder('asc')).toBe('desc');
    expect(flipOrder('desc')).toBe('asc');
  });
  it('id группы для якоря', () => {
    expect(editionGroupId('A–Z')).toBe('E-A_Z');
    expect(editionGroupId('Ё')).toBe('E-Ё');
    expect(editionGroupId('год не указан')).toBe('E-год_не_указан');
  });
});

describe('letterRuns', () => {
  it('буквы по названию без кавычек; номера — от начала раздела во всём списке', () => {
    const items = ['«Акико»', 'Аист', 'Береза', 'Yuki', '1Q84'].map((t) => ({ t }));
    const r = letterRuns(items, (x) => titleKey(x.t), 'WJ', 10);
    expect(r.groups.map(([g, l]) => [g, l.length])).toEqual([['А', 2], ['Б', 1], ['A–Z', 1], ['0–9', 1]]);
    expect(r.nav.map((n) => [n.label, n.index, n.target])).toEqual([['А', 10, 'WJ-А'], ['Б', 12, 'WJ-Б'], ['A–Z', 13, 'WJ-A_Z'], ['0–9', 14, 'WJ-0_9']]);
  });
});
