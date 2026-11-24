// Логика страницы книги
import { SOURCE_NAMES, sourceName } from './sources';
import type { Book } from '../types';

// Источник: основная ссылка, дополнительные ссылки и текстовые источники (без повтора основной)
export type SourceItem = { href: string; text: string } | { text: string };
export function bookSources(b: Book): SourceItem[] | null {
  if (!(b.source || b.sources || b.links)) return null;
  return [
    ...(b.source ? [{ href: b.source, text: sourceName(b.source) }] : []),
    ...(b.links || []).map((l) => ({ href: l.url, text: l.name })),
    ...(b.sources || []).filter((x) => !b.source || SOURCE_NAMES[x] !== sourceName(b.source)).map((x) => ({ text: SOURCE_NAMES[x] || x })),
  ];
}

// Длинное содержание (антологии на сотни стихотворений) сворачивается
export const CONTENTS_COLLAPSE = 60;

// Тираж: «100 000 экз.»
export const printRun = (n: number): string => `${n.toLocaleString('ru-RU')} экз.`;
