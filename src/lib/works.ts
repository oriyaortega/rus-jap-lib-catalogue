// Раздел «Произведения»: фильтр и сортировка таблицы
import { collator, norm } from './text';
import type { Work } from '../types';

export type WorkSort = 'title' | 'author' | 'kind' | 'year';

export function filterWorks(all: Work[], q: string, kind: string, authorName: (id: string) => string): Work[] {
  const nq = norm(q);
  return all.filter((w) => (!kind || w.kind === kind) &&
    (!nq || norm([w.title_ru, w.title_orig, w.title_romaji, ...w.authors.map(authorName)].join(' ')).includes(nq) ||
      String(w.title_orig || '').includes(q)));
}

export function workComparator(sort: string, firstSort: (w: Work) => string): (x: Work, y: Work) => number {
  const cmp: Record<WorkSort, (x: Work, y: Work) => number> = {
    title: (x, y) => collator.compare(x.title_ru, y.title_ru),
    author: (x, y) => collator.compare(firstSort(x), firstSort(y)) || collator.compare(x.title_ru, y.title_ru),
    kind: (x, y) => collator.compare(x.kind || '', y.kind || '') || collator.compare(x.title_ru, y.title_ru),
    // год создания: без года — в конце списка
    year: (x, y) => (x.year ?? 99999) - (y.year ?? 99999) || collator.compare(firstSort(x), firstSort(y)) || collator.compare(x.title_ru, y.title_ru),
  };
  return cmp[sort as WorkSort] || (() => 0);
}

// Год создания: отрицательный — до н. э., пустой — прочерк
export const workYear = (y: number | null | undefined): string | number => (y != null ? (y < 0 ? `${-y} до н. э.` : y) : '—');
