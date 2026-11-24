import { describe, expect, it } from 'vitest';
import {
  EDITION_GROUP, EDITION_SORTS, authorWorks, editionComparator, editionSortOf, booksOfYear, editionGroupId, groupRuns, letterOf, nonfictionGroups, nonfictionTitle, sortPeople,
} from './grouping';
import { book, books } from '../test/fixtures';

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
  it('группы по первой букве: латиница и цифры — отдельно', () => {
    const g = EDITION_GROUP.title;
    expect(g(book({ id: 'a', title_ru: '«Ёжик»' }))).toBe('Ё');
    expect(g(book({ id: 'a', title_ru: 'Shogun' }))).toBe('A–Z');
    expect(g(book({ id: 'a', title_ru: '1Q84' }))).toBe('0–9');
    expect(g(book({ id: 'a', title_ru: '' }))).toBe('?');
    expect(EDITION_GROUP.year(book({ id: 'a' }))).toBe('год не указан');
    expect(EDITION_GROUP.publisher(book({ id: 'a' }))).toBe('издательство не указано');
  });
  it('сортировки', () => {
    expect(ids([...books].sort(EDITION_SORTS.title))).toEqual(['b1', 'b2', 'b6', 'b5', 'b4', 'b3', 'b7']);
    expect(ids([...books].sort(EDITION_SORTS.year)).at(-1)).toBe('b6');
    expect(ids([...books].sort(EDITION_SORTS.publisher)).slice(0, 3)).toEqual(['b2', 'b1', 'b4']);
  });
  it('по дате добавления — по номеру карточки, новые сверху; группы по дате', () => {
    const bookNo = new Map(books.map((b, i) => [b.id, i + 1]));
    expect(ids([...books].sort(editionComparator('added', bookNo)))).toEqual(['b7', 'b6', 'b5', 'b4', 'b3', 'b2', 'b1']);
    expect(editionComparator('title', bookNo)).toBe(EDITION_SORTS.title);
    expect(EDITION_GROUP.added(book({ id: 'a', added: '2026-11-23' }))).toBe('добавлены 23 ноября 2026');
    expect(EDITION_GROUP.added(book({ id: 'a' }))).toBe('дата добавления не указана');
  });
  it('параметр сортировки', () => {
    expect(editionSortOf('added')).toBe('added');
    expect(editionSortOf('year')).toBe('year');
    expect(editionSortOf('author')).toBe('title');
    expect(editionSortOf(null)).toBe('title');
  });
  it('id группы для якоря', () => {
    expect(editionGroupId('A–Z')).toBe('E-A_Z');
    expect(editionGroupId('Ё')).toBe('E-Ё');
    expect(editionGroupId('год не указан')).toBe('E-год_не_указан');
  });
});

describe('Нехудожественная литература', () => {
  it('разделы в постоянном порядке, прочие — после, по алфавиту', () => {
    const list = [
      book({ id: '1', genre: 'учебник' }), book({ id: '2', genre: 'история' }), book({ id: '3', genre: 'путеводитель' }),
      book({ id: '4', genre: 'исследование' }), book({ id: '5', genre: 'история' }), book({ id: '6', genre: 'альбом' }),
    ];
    const groups = nonfictionGroups(list, (x, y) => Number(y.id) - Number(x.id));
    expect(groups.map(([g, l]) => [g, ids(l)])).toEqual([
      ['история', ['5', '2']], ['исследование', ['4']], ['учебник', ['1']], ['альбом', ['6']], ['путеводитель', ['3']],
    ]);
  });
  it('заголовки разделов', () => {
    expect(nonfictionTitle('справочник')).toBe('Справочники и словари');
    expect(nonfictionTitle('альбом')).toBe('Альбом');
  });
});
