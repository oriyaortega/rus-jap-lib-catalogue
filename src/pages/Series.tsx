// Книжная серия: сведения и тома по порядку
import { useCatalog } from '../context';
import { BookDeck } from '../components/cards';
import { ExtLink, SectionTitle } from '../components/common';
import { Legend } from '../components/Legend';
import { plural } from '../lib/text';
import { NotFound } from './NotFound';

export function SeriesPage({ id }: { id: string }) {
  const m = useCatalog();
  const s = m.series(id);
  if (!s) return <NotFound />;
  const books = m.catalog.books.filter((b) => b.series?.id === id)
    .sort((x, y) => (x.series!.no || 0) - (y.series!.no || 0) || (x.year as number) - (y.year as number));
  return (
    <>
      <h1>{`«${s.name}»`}</h1>
      <p className="sub">{`книжная серия · «${s.publisher ?? ''}», ${s.city ?? ''}, ${s.years ?? ''} · ${plural(books.length, ['том', 'тома', 'томов'])}`}</p>
      {s.note && <p>{s.note}</p>}
      {s.source && <p className="small">Источник: <ExtLink href={s.source}>Фантлаб</ExtLink></p>}
      <SectionTitle>Тома по порядку</SectionTitle>
      <Legend kind="genre" />
      <BookDeck books={books} />
    </>
  );
}
