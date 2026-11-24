// Группировка и сортировка списков для страниц (чистые функции)
import { ALPHABET, alphaCompare, collator, dayText, titleKey } from './text';
import type { Book } from '../types';

// Подряд идущие элементы с одинаковым ключом — в одну группу (порядок сохраняется)
export function groupRuns<T>(items: T[], keyOf: (x: T) => string): [string, T[]][] {
  const groups: [string, T[]][] = [];
  for (const x of items) {
    const k = keyOf(x);
    if (!groups.length || groups[groups.length - 1][0] !== k) groups.push([k, []]);
    groups[groups.length - 1][1].push(x);
  }
  return groups;
}

// Люди по алфавиту: Ё — отдельная буква после Е
export function sortPeople<T extends { sort: string; name_ru: string }>(people: T[]): T[] {
  return [...people].sort((a, b) => alphaCompare(a.sort, b.sort) || alphaCompare(a.name_ru, b.name_ru));
}
export const letterOf = (p: { sort: string }): string => p.sort[0].toUpperCase();

// Книги автора, сгруппированные в произведения (по оригинальному названию, иначе по русскому).
// Произведения — по алфавиту названий без кавычек в начале, издания внутри — по году.
export function authorWorks(books: Book[]): Book[][] {
  const sorted = books.filter((b) => !b.hide_on_author).sort((x, y) => (x.year || 9999) - (y.year || 9999));
  const works = new Map<string, Book[]>();
  for (const b of sorted) {
    const key = b.title_orig || b.title_ru;
    const l = works.get(key);
    if (l) l.push(b); else works.set(key, [b]);
  }
  return [...works.values()].sort((x, y) => alphaCompare(titleKey(x[0].title_ru), titleKey(y[0].title_ru)));
}

// Раздел «Издания»: сортировка и группы
export type EditionSort = 'title' | 'year' | 'publisher' | 'added';
const EDITION_SORT_KEYS: EditionSort[] = ['title', 'year', 'publisher', 'added'];
export const editionSortOf = (s: string | null): EditionSort => (EDITION_SORT_KEYS.includes(s as EditionSort) ? s as EditionSort : 'title');
const edTitleKey = (b: Book) => (b.title_ru || '').replace(/^[«"„'(\[\s]+/, '');
const byTitle = (x: Book, y: Book) => alphaCompare(edTitleKey(x), edTitleKey(y)) || (x.year || 0) - (y.year || 0);
export const EDITION_SORTS: Record<Exclude<EditionSort, 'added'>, (x: Book, y: Book) => number> = {
  title: byTitle,
  year: (x, y) => (x.year ?? 99999) - (y.year ?? 99999) || byTitle(x, y),
  publisher: (x, y) => (Number(!x.publisher) - Number(!y.publisher)) || collator.compare(x.publisher || '', y.publisher || '') || (x.year || 0) - (y.year || 0) || byTitle(x, y),
};
// Сравнение для сортировки изданий; «по дате добавления» — по номеру карточки, новые сверху
export function editionComparator(sort: EditionSort, bookNo: Map<string, number>): (x: Book, y: Book) => number {
  if (sort === 'added') return (x, y) => (bookNo.get(y.id) ?? 0) - (bookNo.get(x.id) ?? 0);
  return EDITION_SORTS[sort];
}
export const EDITION_GROUP: Record<EditionSort, (b: Book) => string> = {
  title: (b) => {
    const c = edTitleKey(b)[0]?.toUpperCase() || '?';
    return ALPHABET.includes(c) ? c : /[A-Z]/.test(c) ? 'A–Z' : /\d/.test(c) ? '0–9' : c;
  },
  year: (b) => (b.year ? String(b.year) : 'год не указан'),
  publisher: (b) => b.publisher || 'издательство не указано',
  added: (b) => (b.added ? `добавлены ${dayText(b.added)}` : 'дата добавления не указана'),
};
export const editionGroupId = (g: string): string => `E-${g.replace(/[^\wА-ЯЁа-яё]+/g, '_')}`;

// Фильтр по году: число, 'early' (до 1950) или пусто
export function booksOfYear(books: Book[], year: string | undefined): Book[] {
  return books.filter((b) => !year || (year === 'early' ? !!b.year && b.year < 1950 : b.year === +year));
}

// Нехудожественная литература: разделы в постоянном порядке, внутри — выбранная сортировка
export const NONFICTION_ORDER = ['история', 'исследование', 'искусство', 'очерки', 'справочник', 'учебник'];
export function nonfictionGroups(books: Book[], cmp: (x: Book, y: Book) => number): [string, Book[]][] {
  const rank = (g: string) => { const i = NONFICTION_ORDER.indexOf(g); return i < 0 ? 99 : i; };
  const groups = new Map<string, Book[]>();
  for (const b of [...books].sort((x, y) => rank(x.genre) - rank(y.genre) || collator.compare(x.genre || '', y.genre || '') || cmp(x, y))) {
    const g = b.genre || 'другое';
    const l = groups.get(g);
    if (l) l.push(b); else groups.set(g, [b]);
  }
  return [...groups];
}
export const nonfictionTitle = (g: string): string => ({
  'исследование': 'Исследования', 'очерки': 'Очерки и публицистика', 'история': 'История', 'искусство': 'Искусство',
  'справочник': 'Справочники и словари', 'учебник': 'Учебники и разговорники',
} as Record<string, string>)[g] || g[0].toUpperCase() + g.slice(1);
