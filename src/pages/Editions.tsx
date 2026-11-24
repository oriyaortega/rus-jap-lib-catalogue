// Издания: все книги карточками или списком; сортировка по алфавиту, году, издательству или дате добавления; выбор года.
// Книги рисуются постепенно, по мере прокрутки.
import { Fragment } from 'react';
import { useCatalog } from '../context';
import { BookDeck } from '../components/cards';
import { BooksTable } from '../components/BooksTable';
import { JumpNav } from '../components/JumpNav';
import { Legend } from '../components/Legend';
import { SwitchGroup } from '../components/switches';
import { useProgressive } from '../hooks/useProgressive';
import { EDITION_GROUP, booksOfYear, editionComparator, editionGroupId, editionSortOf, groupRuns } from '../lib/grouping';
import { PORTION, groupStarts, takeGroups } from '../lib/progressive';
import { plural } from '../lib/text';

export function EditionsPage({ year, params }: { year?: string; params: URLSearchParams }) {
  const m = useCatalog();
  const view = params.get('view') === 'list' ? 'list' : 'cards';
  const sort = editionSortOf(params.get('sort'));
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
  const books = booksOfYear(m.catalog.books, year).sort(editionComparator(sort, m.bookNo));
  const groups = groupRuns(books, EDITION_GROUP[sort]);
  const starts = groupStarts(groups);
  const lazy = useProgressive(books.length, view === 'list' ? PORTION.rows : PORTION.bookCards, `${year}:${view}:${sort}`);
  const shown = takeGroups(groups, lazy.limit);

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
          ['added', 'по дате добавления', href((p) => p.set('sort', 'added'))],
        ]} />
      </div>
      <details className="year-filter" open={!!year}>
        <summary>Выбрать год издания</summary>
        <div className="years">
          {years.map((y) => <a key={y} href={yearHref(y)} aria-current={String(y) === year ? 'true' : undefined}>{y}</a>)}
        </div>
      </details>
      {sort === 'title' && <JumpNav href={href(() => {})} onJump={lazy.reveal}
        items={groups.map(([g], i) => ({ label: g, target: editionGroupId(g), index: starts[i] }))} />}
      {!books.length ? <p>За этот год изданий пока нет.</p>
        : view === 'cards'
          ? <><Legend kind="genre" />{shown.map(([g, list], i) => (
            <Fragment key={i}>
              {/* в заголовке — число книг всей группы, даже если она отрисована не целиком */}
              <h3 className="group-h" id={editionGroupId(g)}>{`${g} `}<span>{groups[i][1].length}</span></h3>
              <BookDeck books={list} />
            </Fragment>
          ))}</>
          : <BooksTable groups={shown} groupId={editionGroupId} />}
      {lazy.sentinel}
    </>
  );
}
