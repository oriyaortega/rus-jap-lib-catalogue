// Издания: все книги карточками или списком; выбор года.
// Сортировка — кнопками над списком (по алфавиту, году, издательству, дате добавления) или заголовками столбцов таблицы
// (ещё по автору и серии); повторное нажатие на выбранную сортировку меняет направление (?order=asc|desc).
// Книги рисуются постепенно, по мере прокрутки.
import { Fragment } from 'react';
import { useCatalog } from '../context';
import { BookDeck } from '../components/cards';
import { BooksTable } from '../components/BooksTable';
import { JumpNav } from '../components/JumpNav';
import { Legend } from '../components/Legend';
import { EditionSortSwitch, SwitchGroup, editionSortState, viewOf } from '../components/switches';
import { useProgressive } from '../hooks/useProgressive';
import { booksOfYear, editionComparator, editionGroupId, editionGroupOf, groupRuns } from '../lib/grouping';
import { PORTION, groupStarts, takeGroups } from '../lib/progressive';
import { plural } from '../lib/text';

export function EditionsPage({ year, params }: { year?: string; params: URLSearchParams }) {
  const m = useCatalog();
  const view = viewOf(params);
  const page = `editions${year ? `/${year}` : ''}`;
  const { sort, order, href, table } = editionSortState(page, params);
  const qs = params.toString();
  const yearHref = (y: string | number) => `#/editions${y ? `/${y}` : ''}${qs ? `?${qs}` : ''}`;

  // все годы, за которые в каталоге есть издания, по порядку
  const years = [...new Set(m.catalog.books.map((b) => b.year).filter((y): y is number => !!y))].sort((a, b) => a - b);
  const keys = m.editionKeys;
  const books = booksOfYear(m.catalog.books, year).sort(editionComparator(sort, order, keys));
  const groups = groupRuns(books, editionGroupOf(sort, keys));
  const starts = groupStarts(groups);
  const lazy = useProgressive(books.length, view === 'list' ? PORTION.rows : PORTION.bookCards, `${year}:${view}:${sort}:${order}`);
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
        <EditionSortSwitch page={page} params={params} />
      </div>
      <details className="year-filter" open={!!year}>
        <summary>Выбрать год издания</summary>
        <div className="years">
          {years.map((y) => <a key={y} href={yearHref(y)} aria-current={String(y) === year ? 'true' : undefined}>{y}</a>)}
        </div>
      </details>
      {(sort === 'title' || sort === 'author') && <JumpNav href={href(() => {})} onJump={lazy.reveal}
        items={groups.flatMap(([g], i) => (g.length > 3 ? [] : [{ label: g, target: editionGroupId(g), index: starts[i] }]))} />}
      {!books.length ? <p>За этот год изданий пока нет.</p>
        : view === 'cards'
          ? <><Legend kind="genre" />{shown.map(([g, list], i) => (
            <Fragment key={i}>
              {/* в заголовке — число книг всей группы, даже если она отрисована не целиком */}
              <h3 className="group-h" id={editionGroupId(g)}>{`${g} `}<span>{groups[i][1].length}</span></h3>
              <BookDeck books={list} />
            </Fragment>
          ))}</>
          : <BooksTable groups={shown} groupId={editionGroupId} sort={table} />}
      {lazy.sentinel}
    </>
  );
}
