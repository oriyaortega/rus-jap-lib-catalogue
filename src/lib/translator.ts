// Переводы одного переводчика, сгруппированные по авторам
import { collator } from './text';
import type { Book } from '../types';

export const ANON = '_anon';

// В сборнике учитываются только те авторы, чьи вещи перевёл именно этот переводчик.
// Книги — по году, авторы — по алфавиту фамилий, анонимные произведения — в конце.
export function translationsByAuthor(translatorId: string, books: Book[], sortOfAuthor: (id: string) => string | undefined): [string, Book[]][] {
  const sorted = [...books].sort((x, y) => (x.year || 9999) - (y.year || 9999));
  const byAuthor = new Map<string, Book[]>();
  for (const b of sorted) {
    const authors = b.contents
      ? [...new Set(b.contents.filter((w) => w.tr.includes(translatorId)).map((w) => w.a || ANON))]
      : b.authors;
    for (const a of authors) {
      const l = byAuthor.get(a);
      if (l) l.push(b); else byAuthor.set(a, [b]);
    }
  }
  const key = (a: string) => (a === ANON ? 'яяя' : sortOfAuthor(a) || a);
  return [...byAuthor.keys()].sort((a, b) => collator.compare(key(a), key(b))).map((a) => [a, byAuthor.get(a)!]);
}
