// Страница переводчика: профиль и переводы, сгруппированные по авторам
import { Fragment } from 'react';
import { useCatalog } from '../context';
import { BookDeck } from '../components/cards';
import { SectionTitle } from '../components/common';
import { AuthorLink } from '../components/links';
import { Profile } from '../components/Profile';
import { plural } from '../lib/text';
import { ANON, translationsByAuthor } from '../lib/translator';
import { useProgressive } from '../hooks/useProgressive';
import { PORTION, takeGroups, totalOf } from '../lib/progressive';
import { NotFound } from './NotFound';

export function TranslatorPage({ id }: { id: string }) {
  const m = useCatalog();
  const books = m.translationsOf(id);
  const groups = translationsByAuthor(id, books, (a) => m.authorsById.get(a)?.sort);
  const lazy = useProgressive(totalOf(groups), PORTION.bookCards, id);
  if (!m.translatorsById.has(id)) return <NotFound />;
  return (
    <>
      <Profile person={m.translatorInfo(id)} role="переводчик" />
      <SectionTitle>{`Переводы · ${plural(books.length, ['книга', 'книги', 'книг'])}`}</SectionTitle>
      {takeGroups(groups, lazy.limit).map(([a, list]) => {
        const withContents = list.filter((b) => b.contents);
        return (
          <Fragment key={a}>
            <SectionTitle>{a === ANON ? 'Анонимные произведения' : <AuthorLink id={a} />}</SectionTitle>
            <BookDeck books={list} />
            {withContents.length > 0 && (
              <ul className="ed-list">
                {withContents.map((b) => (
                  <li key={b.id}>
                    <a href={`#/book/${b.id}`}>{b.title_ru}</a>{`: ${(b.contents || []).filter((w) => w.tr.includes(id) && (w.a || ANON) === a).map((w) => `«${(w.t || '').replace(/^«|»$/g, '')}»`).join(', ')}`}
                  </li>
                ))}
              </ul>
            )}
          </Fragment>
        );
      })}
      {lazy.sentinel}
    </>
  );
}
