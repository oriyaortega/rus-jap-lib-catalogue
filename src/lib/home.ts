import type { Book } from '../types';

// Последние добавления: по дате внесения, при равной дате — более поздняя карточка выше
export function recentlyAdded(books: Book[], bookNo: Map<string, number>, n: number): Book[] {
  return [...books].sort((a, b) => (b.added || '').localeCompare(a.added || '') || (bookNo.get(b.id)! - bookNo.get(a.id)!)).slice(0, n);
}

// Новейшие издания: по году выхода, затем по дате внесения и номеру карточки
export function newestBooks(books: Book[], bookNo: Map<string, number>, n: number): Book[] {
  return books.filter((b) => b.year)
    .sort((a, b) => b.year! - a.year! || (b.added || '').localeCompare(a.added || '') || (bookNo.get(b.id)! - bookNo.get(a.id)!)).slice(0, n);
}
