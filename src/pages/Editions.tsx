// Издания: все книги карточками или списком; выбор года.
// Сортировка — кнопками над списком (по алфавиту, году, издательству, дате добавления) или заголовками столбцов таблицы
// (ещё по автору и серии); повторное нажатие на выбранную сортировку меняет направление (?order=asc|desc).
// Книги рисуются постепенно, по мере прокрутки.
import { Fragment } from 'react';
import { useCatalog } from '../context';
import { BookDeck } from '../components/cards';
import { BooksTable, orderMark, orderTitle, type TableColumn } from '../components/BooksTable';
import { JumpNav } from '../components/JumpNav';
import { Legend } from '../components/Legend';
import { SwitchGroup } from '../components/switches';
import { useProgressive } from '../hooks/useProgressive';
import {
  type EditionKeys, type EditionSort, booksOfYear, defaultOrder, editionComparator, editionGroupId, editionGroupOf, editionOrderOf, editionSortOf, flipOrder, groupRuns,
} from '../lib/grouping';
import { PORTION, groupStarts, takeGroups } from '../lib/progressive';
import { plural } from '../lib/text';
import { replaceParams } from '../router';

export function EditionsPage({ year, params }: { year?: string; params: URLSearchParams }) {
  const m = useCatalog();
  const view = params.get('view') === 'list' ? 'list' : 'cards';
  const sort = editionSortOf(params.get('sort'));
  const order = editionOrderOf(sort, params.get('order'));
  const page = `editions${year ? `/${year}` : ''}`;
  // параметры сортировки: по умолчанию (по алфавиту, в обычном направлении) их в адресе нет
  const setSort = (p: URLSearchParams, s: EditionSort, o = defaultOrder(s)) => {
    if (s === 'title') p.delete('sort'); else p.set('sort', s);
    if (o === defaultOrder(s)) p.delete('order'); else p.set('order', o);
  };
  // выбранная сортировка — сменить направление, другая — включить её в обычном направлении
  const toggle = (p: URLSearchParams, s: EditionSort) => setSort(p, s, s === sort ? flipOrder(order) : defaultOrder(s));
  // ссылка на этот же раздел с изменёнными параметрами вида и сортировки
  const href = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams({ ...(view === 'list' ? { view } : {}) });
    setSort(p, sort, order);
    mut(p);
    const qs = p.toString();
    return `#/${page}${qs ? `?${qs}` : ''}`;
  };
  const sortItem = (s: EditionSort, label: string): [string, string, string, string?] => (s === sort
    ? [s, `${label}${orderMark(order)}`, href((p) => toggle(p, s)), `${orderTitle(order)}; нажмите, чтобы ${orderTitle(flipOrder(order))}`]
    : [s, label, href((p) => toggle(p, s))]);
  const qs = params.toString();
  const yearHref = (y: string | number) => `#/editions${y ? `/${y}` : ''}${qs ? `?${qs}` : ''}`;

  // все годы, за которые в каталоге есть издания, по порядку
  const years = [...new Set(m.catalog.books.map((b) => b.year).filter((y): y is number => !!y))].sort((a, b) => a - b);
  const keys: EditionKeys = { bookNo: m.bookNo, authorSort: (b) => m.firstAuthorSort(b), seriesName: (b) => m.seriesOf(b)?.name || '' };
  const books = booksOfYear(m.catalog.books, year).sort(editionComparator(sort, order, keys));
  const groups = groupRuns(books, editionGroupOf(sort, keys));
  const starts = groupStarts(groups);
  const lazy = useProgressive(books.length, view === 'list' ? PORTION.rows : PORTION.bookCards, `${year}:${view}:${sort}:${order}`);
  // заголовок столбца таблицы: адрес меняется без новой записи в истории и без прокрутки наверх, как в «Произведениях»
  const sortByColumn = (c: TableColumn) => replaceParams(page, (p) => toggle(p, c));
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
          sortItem('title', 'по алфавиту'),
          sortItem('year', 'по году издания'),
          sortItem('publisher', 'по издательству'),
          sortItem('added', 'по дате добавления'),
        ]} />
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
          : <BooksTable groups={shown} groupId={editionGroupId} sort={{ current: sort, order, onSort: sortByColumn }} />}
      {lazy.sentinel}
    </>
  );
}
