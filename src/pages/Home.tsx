import { useCatalog } from '../context';
import { BookDeck } from '../components/cards';
import { SectionTitle } from '../components/common';
import { Legend } from '../components/Legend';
import { authorsNames } from '../components/links';
import { newestBooks, recentlyAdded } from '../lib/home';

// Главная: последние добавления (по дате внесения) и новейшие издания (по году выхода)
export function HomePage() {
  const m = useCatalog();
  const recent = recentlyAdded(m.catalog.books, m.bookNo, 5);
  const newest = newestBooks(m.catalog.books, m.bookNo, 12);
  return (
    <>
      <SectionTitle>Последние добавления</SectionTitle>
      <Legend kind="genre" />
      <BookDeck books={recent} />
      <section className="recent newest">
        <SectionTitle>Новейшие издания</SectionTitle>
        {newest.map((b) => (
          <p key={b.id}>
            <span className="when">{`${b.year}${b.publisher ? ` · ${b.publisher}` : ''}`}</span><br />
            {`${authorsNames(m, b)}. `}<a href={`#/book/${b.id}`}>{b.title_ru}</a>
          </p>
        ))}
      </section>
    </>
  );
}
