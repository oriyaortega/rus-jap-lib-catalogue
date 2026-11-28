// Раздел «Произведения»: фильтр и сортировка (кнопки над списком и заголовки столбцов таблицы)
import { alphaCompare, collator, norm, titleKey } from './text';
import type { Work } from '../types';
import type { SortOrder } from './grouping';

export type WorkSort = 'title' | 'author' | 'kind' | 'year';

export function filterWorks(all: Work[], q: string, kind: string, authorName: (id: string) => string): Work[] {
  const nq = norm(q);
  return all.filter((w) => (!kind || w.kind === kind) &&
    (!nq || norm([w.title_ru, w.title_orig, w.title_romaji, ...w.authors.map(authorName)].join(' ')).includes(nq) ||
      String(w.title_orig || '').includes(q)));
}

const WORK_SORT_KEYS: WorkSort[] = ['title', 'author', 'kind', 'year'];
// по умолчанию — по алфавиту названий
export const workSortOf = (s: string | null): WorkSort => (WORK_SORT_KEYS.includes(s as WorkSort) ? s as WorkSort : 'title');

// Направление меняет только основной ключ: произведения без года, автора или вида всегда в конце,
// а одинаковые по ключу — по автору и названию по возрастанию.
export function workComparator(sort: string, firstSort: (w: Work) => string, order: SortOrder = 'asc'): (x: Work, y: Work) => number {
  const dir = order === 'desc' ? -1 : 1;
  // по алфавиту названий без кавычек и знаков в начале, Ё — после Е (как «Издания»)
  const byTitle = (x: Work, y: Work) => alphaCompare(titleKey(x.title_ru), titleKey(y.title_ru)) || collator.compare(x.title_ru, y.title_ru);
  const keyed = (has: (w: Work) => boolean, primary: (x: Work, y: Work) => number, rest: (x: Work, y: Work) => number = byTitle) =>
    (x: Work, y: Work) => (Number(!has(x)) - Number(!has(y))) || dir * primary(x, y) || rest(x, y);
  const cmp: Record<WorkSort, (x: Work, y: Work) => number> = {
    title: (x, y) => dir * byTitle(x, y),
    author: keyed((w) => !!firstSort(w), (x, y) => collator.compare(firstSort(x), firstSort(y))),
    kind: keyed((w) => !!w.kind, (x, y) => collator.compare(x.kind || '', y.kind || '')),
    // год создания
    year: keyed((w) => w.year != null, (x, y) => (x.year ?? 0) - (y.year ?? 0), (x, y) => collator.compare(firstSort(x), firstSort(y)) || byTitle(x, y)),
  };
  return cmp[sort as WorkSort] || (() => 0);
}

// Год создания: отрицательный — до н. э., пустой — прочерк
export const workYear = (y: number | null | undefined): string | number => (y != null ? (y < 0 ? `${-y} до н. э.` : y) : '—');
