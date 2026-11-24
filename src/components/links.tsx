// Ссылки на людей и серии, выходные данные — то, что повторяется на многих страницах
import { useCatalog } from '../context';
import { Join } from './common';
import type { Book } from '../types';

export function AuthorLink({ id }: { id: string }) {
  const m = useCatalog();
  return <a href={`#/author/${id}`}>{m.authorInfo(id).name_ru}</a>;
}

export function TranslatorLink({ id, full }: { id: string; full?: boolean }) {
  const t = useCatalog().translatorInfo(id);
  return <a href={`#/translator/${id}`}>{full ? t.name_ru : (t.short || t.name_ru)}</a>;
}

// Имена авторов книги через запятую, без ссылок
export function authorsNames(m: ReturnType<typeof useCatalog>, b: Book): string {
  return b.authors.map((id) => m.authorInfo(id).name_ru).join(', ');
}

// Переводчики в подписи карточки: не больше трёх, остальные — «и др.»
export function TranslatorsShort({ book }: { book: Book }) {
  const ids = book.translators;
  return (
    <>
      <Join items={ids.slice(0, 3).map((id) => <TranslatorLink key={id} id={id} />)} />
      {ids.length > 3 && ' и др.'}
    </>
  );
}

// Выходные данные одной строкой: «Издательство», Город, год; пустые поля пропускаются
export const imprintText = (b: { publisher?: string | null; city?: string | null; year?: number | string | null }): string =>
  [b.publisher && `«${b.publisher}»`, b.city, b.year || 'б. г.'].filter(Boolean).join(', ');

// Серия одной строкой: «Название», № N
export function SeriesText({ book, link = true }: { book: Book; link?: boolean }) {
  const s = useCatalog().seriesOf(book);
  if (!s) return null;
  const name = `«${s.name}»${book.series?.no ? `, № ${book.series.no}` : ''}`;
  return link ? <a href={`#/series/${s.id}`}>{name}</a> : <>{name}</>;
}
