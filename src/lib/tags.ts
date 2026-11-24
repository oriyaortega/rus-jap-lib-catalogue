// Теги и поиск по ним
import { collator } from './text';
import type { Book } from '../types';

export const TYPE_TAGS = ['художественная', 'нехудожественная', 'переводная', 'на русском'];
// Теги, которые показываются всегда, даже если книг по ним пока нет
export const TOPIC_TAGS = ['бизнес', 'экономика', 'политика', 'театр кабуки'];   // темы нехудожественной литературы
export const ALWAYS_TAGS = [...TOPIC_TAGS, 'детская литература'];

// Выбранные теги из параметра tags=a,b
export const parseTags = (s: string | null): Set<string> => new Set((s || '').split(',').filter(Boolean));

// Включить или выключить тег; возвращает новое значение параметра
export function toggleTag(current: string | null, tag: string): string {
  const s = parseTags(current);
  if (s.has(tag)) s.delete(tag); else s.add(tag);
  return [...s].join(',');
}

// Слова запроса
export const tokenize = (q: string): string[] => q.trim().split(/\s+/).filter(Boolean);

// Сколько найденных книг у каждого тега
export function tagCounts(books: Book[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const b of books) for (const t of b.tags) counts.set(t, (counts.get(t) || 0) + 1);
  return counts;
}

// Все теги каталога для облака: типовые отдельно, остальные по алфавиту
export function tagCloud(all: Book[]): { type: string[]; other: string[] } {
  const tags = [...new Set([...all.flatMap((b) => b.tags), ...ALWAYS_TAGS])];
  return {
    type: TYPE_TAGS.filter((t) => tags.includes(t)),
    other: tags.filter((t) => !TYPE_TAGS.includes(t)).sort((a, b) => collator.compare(a, b)),
  };
}
