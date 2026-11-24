// Издания: все книги карточками или списком; сортировка по алфавиту, году или издательству; выбор года
import { Fragment } from 'react';
import { useCatalog } from '../context';
import { BookDeck } from '../components/cards';
import { BooksTable } from '../components/BooksTable';
import { JumpNav } from '../components/JumpNav';
import { Legend } from '../components/Legend';
import { SwitchGroup } from '../components/switches';
import { EDITION_GROUP, EDITION_SORTS, booksOfYear, editionGroupId, groupRuns, type EditionSort } from '../lib/grouping';
import { plural } from '../lib/text';

export function EditionsPage({ year, params }: { year?: string; params: URLSearchParams }) {
  const m = useCatalog();
  const view = params.get('view') === 'list' ? 'list' : 'cards';
  const s = params.get('sort');
  const sort: EditionSort = s === 'year' || s === 'publisher' ? s : 'title';
  // ссылка на этот же раздел с изменёнными параметрами вида и сортировки
  const href = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams({ ...(view === 'list' ? { view } : {}), ...(sort !== 'title' ? { sort } : {}) });
    mut(p);
    const qs = p.toString();
    return `#/editions${year ? `/${year}` : ''}${qs ? `?${qs}` : ''}`;
  };
  const qs = params.toString();
  const yearHref = (y: string | number) => `#/editions${y ? `/${y}` : ''}${qs ? `?${qs}` : ''}`;

  // все годы, за которые в каталоге есть издания, по порядку
  const years = [...new Set(m.catalog.books.map((b) => b.year).filter((y): y is number => !!y))].sort((a, b) => a - b);
  const books = booksOfYear(m.catalog.books, year).sort(EDITION_SORTS[sort]);
  const groups = groupRuns(books, EDITION_GROUP[sort]);

  return (
    <>
      <h1>Издания</h1>
      <p className="sub">
        {`${plural(books.length, ['издание', 'издания', 'изданий'])}${year ? ` · ${year === 'early' ? 'до 1950 года' : `${year} год`} · ` : ''}`}
        {year && <a href={yearHref('')}>все годы</a>}
      </p>
      <div className="ed-controls">
        <SwitchGroup current={view} items={[['cards', 'Карточки', href((p) => p.delete('view'))], ['list', 'Список', href((p) => p.set('view', 'list'))]]} />
        <span className="ed-sort-label">Сортировка:</span>
        <SwitchGroup current={sort} items={[
          ['title', 'по алфавиту', href((p) => p.delete('sort'))],
          ['year', 'по году издания', href((p) => p.set('sort', 'year'))],
          ['publisher', 'по издательству', href((p) => p.set('sort', 'publisher'))],
        ]} />
      </div>
      <details className="year-filter" open={!!year}>
        <summary>Выбрать год издания</summary>
        <div className="years">
          {years.map((y) => <a key={y} href={yearHref(y)} aria-current={String(y) === year ? 'true' : undefined}>{y}</a>)}
        </div>
      </details>
      {sort === 'title' && <JumpNav href={href(() => {})} items={groups.map(([g]) => ({ label: g, target: editionGroupId(g) }))} />}
      {!books.length ? <p>За этот год изданий пока нет.</p>
        : view === 'cards'
          ? <><Legend kind="genre" />{groups.map(([g, list], i) => (
            <Fragment key={i}>
              <h3 className="group-h" id={editionGroupId(g)}>{`${g} `}<span>{list.length}</span></h3>
              <BookDeck books={list} />
            </Fragment>
          ))}</>
          : <BooksTable groups={groups} groupId={editionGroupId} />}
    </>
  );
}
