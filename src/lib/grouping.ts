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

// Раздел «Издания»: сортировка и группы.
// Порядок (по возрастанию или убыванию) меняет только основной ключ: издания без него (без года, издательства,
// автора, серии) всегда в конце, а одинаковые по ключу — всегда по алфавиту названий.
export type EditionSort = 'title' | 'author' | 'year' | 'publisher' | 'series' | 'added';
export type SortOrder = 'asc' | 'desc';
const EDITION_SORT_KEYS: EditionSort[] = ['title', 'author', 'year', 'publisher', 'series', 'added'];
export const editionSortOf = (s: string | null): EditionSort => (EDITION_SORT_KEYS.includes(s as EditionSort) ? s as EditionSort : 'title');
// порядок по умолчанию: новые добавления сверху, остальное — по возрастанию
export const defaultOrder = (sort: EditionSort): SortOrder => (sort === 'added' ? 'desc' : 'asc');
export const editionOrderOf = (sort: EditionSort, s: string | null): SortOrder => (s === 'asc' || s === 'desc' ? s : defaultOrder(sort));
export const flipOrder = (o: SortOrder): SortOrder => (o === 'asc' ? 'desc' : 'asc');

export const edTitleKey = (b: Book): string => (b.title_ru || '').replace(/^[«"„'(\[\s]+/, '');
const byTitle = (x: Book, y: Book) => alphaCompare(edTitleKey(x), edTitleKey(y)) || (x.year || 0) - (y.year || 0);
const letterGroup = (s: string, none: string) => {
  const c = s[0]?.toUpperCase();
  if (!c) return none;
  return ALPHABET.includes(c) ? c : /[A-Z]/.test(c) ? 'A–Z' : /\d/.test(c) ? '0–9' : c;
};

// Сведения о книге, которых нет в ней самой: номер карточки, фамилия первого автора, название серии
export interface EditionKeys {
  bookNo: Map<string, number>;
  authorSort: (b: Book) => string;
  seriesName: (b: Book) => string;
}

// Сравнение для сортировки изданий; «по дате добавления» — по номеру карточки
export function editionComparator(sort: EditionSort, order: SortOrder, k: EditionKeys): (x: Book, y: Book) => number {
  const dir = order === 'desc' ? -1 : 1;
  const no = (b: Book) => k.bookNo.get(b.id) ?? 0;
  const keyed = (has: (b: Book) => boolean, primary: (x: Book, y: Book) => number, rest: (x: Book, y: Book) => number = byTitle) =>
    (x: Book, y: Book) => (Number(!has(x)) - Number(!has(y))) || dir * primary(x, y) || rest(x, y);
  switch (sort) {
    case 'title': return (x, y) => dir * byTitle(x, y);
    case 'added': return (x, y) => dir * (no(x) - no(y));
    case 'author': return keyed((b) => !!k.authorSort(b), (x, y) => alphaCompare(k.authorSort(x), k.authorSort(y)));
    case 'year': return keyed((b) => !!b.year, (x, y) => (x.year || 0) - (y.year || 0));
    case 'publisher': return keyed((b) => !!b.publisher, (x, y) => collator.compare(x.publisher || '', y.publisher || ''),
      (x, y) => (x.year || 0) - (y.year || 0) || byTitle(x, y));
    case 'series': return keyed((b) => !!k.seriesName(b), (x, y) => collator.compare(k.seriesName(x), k.seriesName(y)),
      (x, y) => (x.series?.no ?? 9999) - (y.series?.no ?? 9999) || byTitle(x, y));
  }
}
// Заголовки групп; разбивка на группы — по подряд идущим одинаковым заголовкам (groupRuns)
export function editionGroupOf(sort: EditionSort, k: EditionKeys): (b: Book) => string {
  switch (sort) {
    case 'title': return (b) => letterGroup(edTitleKey(b), '?');
    case 'author': return (b) => letterGroup(k.authorSort(b), 'автор не указан');
    case 'year': return (b) => (b.year ? String(b.year) : 'год не указан');
    case 'publisher': return (b) => b.publisher || 'издательство не указано';
    case 'series': return (b) => (k.seriesName(b) ? `«${k.seriesName(b)}»` : 'вне серий');
    case 'added': return (b) => (b.added ? `добавлены ${dayText(b.added)}` : 'дата добавления не указана');
  }
}
export const editionGroupId = (g: string): string => `E-${g.replace(/[^\wА-ЯЁа-яё]+/g, '_')}`;

// Разбивка уже отсортированного по алфавиту списка на буквы и навигация по ним («Произведения»,
// «Нехудожественная литература»): prefix — своё для каждого раздела страницы, base — номер первого элемента
// раздела во всём списке страницы (для дорисовки ленивого списка до нужной буквы).
// key — тот же ключ, по которому список отсортирован (иначе буквы разорвутся).
export interface LetterJump { label: string; target: string; index: number }
export function letterRuns<T>(all: T[], key: (x: T) => string, prefix: string, base = 0): { groups: [string, T[]][]; nav: LetterJump[]; id: (g: string) => string } {
  const id = (g: string) => `${prefix}-${g.replace(/[^\wА-ЯЁа-яё]+/g, '_')}`;
  const groups = groupRuns(all, (x) => letterGroup(key(x), '?'));
  const nav: LetterJump[] = [];
  let i = base;
  for (const [g, l] of groups) { nav.push({ label: g, target: id(g), index: i }); i += l.length; }
  return { groups, nav, id };
}

// Фильтр по году: число, 'early' (до 1950) или пусто
export function booksOfYear(books: Book[], year: string | undefined): Book[] {
  return books.filter((b) => !year || (year === 'early' ? !!b.year && b.year < 1950 : b.year === +year));
}
