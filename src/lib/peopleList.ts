// Перечни авторов и переводчиков: сортировка (по алфавиту, числу изданий, году рождения)
import { alphaCompare } from './text';
import type { SortOrder } from './grouping';
import type { PersonInfo } from '../types';

export type PeopleSort = 'name' | 'books' | 'born';
const PEOPLE_SORT_KEYS: PeopleSort[] = ['name', 'books', 'born'];
// по умолчанию — по алфавиту
export const peopleSortOf = (s: string | null): PeopleSort => (PEOPLE_SORT_KEYS.includes(s as PeopleSort) ? s as PeopleSort : 'name');
// число изданий — сначала самые плодовитые, остальное — по возрастанию
export const peopleDefaultOrder = (s: PeopleSort): SortOrder => (s === 'books' ? 'desc' : 'asc');

export const bornYear = (p: PersonInfo): number | null => p.w?.born?.year ?? null;

// Направление меняет только основной ключ: люди без года рождения — всегда в конце, равные — по алфавиту.
// Отсылки с псевдонимов имеют смысл только по алфавиту: при других сортировках их нет.
export function sortPeopleBy<T extends PersonInfo>(people: T[], sort: PeopleSort, order: SortOrder, count: (p: T) => number): T[] {
  const dir = order === 'desc' ? -1 : 1;
  const byName = (a: T, b: T) => alphaCompare(a.sort, b.sort) || alphaCompare(a.name_ru, b.name_ru);
  if (sort === 'name') return [...people].sort((a, b) => dir * byName(a, b));
  const list = people.filter((p) => !p.aliasOf);
  if (sort === 'books') return list.sort((a, b) => dir * (count(a) - count(b)) || byName(a, b));
  return list.sort((a, b) => {
    const x = bornYear(a), y = bornYear(b);
    return (Number(x == null) - Number(y == null)) || dir * ((x ?? 0) - (y ?? 0)) || byName(a, b);
  });
}
