// Перечни авторов и переводчиков
import { useCatalog } from '../context';
import { LettersPage } from '../components/LettersPage';
import { plural } from '../lib/text';
import type { PersonInfo } from '../types';

export function AuthorsPage({ params }: { params: URLSearchParams }) {
  const m = useCatalog();
  const people = [...m.catalog.authors.map((a) => m.authorInfo(a.id)), ...m.aliasEntries()];
  const extra = (p: PersonInfo) => {
    if (p.aliasOf) return `псевдоним; см. ${p.aliasOf.name_ru}`;
    const nb = m.booksOf(p.id).length, nw = m.worksOf(p.id).length;
    return [nb && plural(nb, ['издание', 'издания', 'изданий']), nw && plural(nw, ['произведение', 'произведения', 'произведений'])].filter(Boolean).join(' · ');
  };
  return (
    <LettersPage params={params} title="Авторы" hrefBase="author" prefix="A" people={people} extra={extra}
      sub={`по русскому алфавиту · ${plural(m.catalog.authors.length, ['автор', 'автора', 'авторов'])}`} />
  );
}

export function TranslatorsPage({ params }: { params: URLSearchParams }) {
  const m = useCatalog();
  const extra = (p: PersonInfo) => {
    const books = m.translationsOf(p.id);
    const authors = [...new Set(books.flatMap((b) => b.authors))].map((a) => m.authorInfo(a).name_ru).join(', ');
    return `${plural(books.length, ['перевод', 'перевода', 'переводов'])}: ${authors}`;
  };
  return (
    <LettersPage params={params} title="Переводчики" hrefBase="translator" prefix="T" extra={extra}
      people={m.catalog.translators.map((t) => m.translatorInfo(t.id))}
      sub={`по русскому алфавиту · ${plural(m.catalog.translators.length, ['переводчик', 'переводчика', 'переводчиков'])}`} />
  );
}
