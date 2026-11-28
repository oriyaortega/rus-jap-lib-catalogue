// Переключатели вида («Карточки / Список») и сортировки книг
import { hrefWith, replaceParams } from '../router';
import type { BookSort } from '../lib/model';
import { type EditionSort, type SortOrder, defaultOrder, editionSortOf, flipOrder } from '../lib/grouping';
import { orderMark, orderTitle, type TableColumn, type TableSort } from './BooksTable';

// items — [ключ, подпись, ссылка, подсказка?]
export function SwitchGroup({ items, current, label }: { items: [string, string, string, string?][]; current: string; label?: string }) {
  return (
    <div className="view-switch" role="group" aria-label={label}>
      {items.map(([k, text, href, title]) => <a key={k} href={href} title={title} aria-current={k === current ? 'true' : undefined}>{text}</a>)}
    </div>
  );
}

export const viewOf = (params: URLSearchParams): 'cards' | 'list' => (params.get('view') === 'list' ? 'list' : 'cards');

export function ViewSwitch({ page, params }: { page: string; params: URLSearchParams }) {
  return (
    <SwitchGroup current={viewOf(params)} items={[
      ['cards', 'Карточки', hrefWith(page, params, (p) => p.delete('view'))],
      ['list', 'Список', hrefWith(page, params, (p) => p.set('view', 'list'))],
    ]} />
  );
}

const BOOK_SORT_KEYS: BookSort[] = ['author', 'title', 'year', 'publisher'];
export const sortOf = (params: URLSearchParams): BookSort => {
  const s = params.get('sort') as BookSort | null;
  return s && BOOK_SORT_KEYS.includes(s) ? s : 'author';
};

// Сортировка книг: по автору (по умолчанию), названию, году издания, издательству
export function SortSwitch({ page, params }: { page: string; params: URLSearchParams }) {
  return (
    <>
      <span className="ed-sort-label">Сортировка:</span>
      <SwitchGroup current={sortOf(params)} items={[
        ['author', 'по автору', hrefWith(page, params, (p) => p.delete('sort'))],
        ['title', 'по названию', hrefWith(page, params, (p) => p.set('sort', 'title'))],
        ['year', 'по году издания', hrefWith(page, params, (p) => p.set('sort', 'year'))],
        ['publisher', 'по издательству', hrefWith(page, params, (p) => p.set('sort', 'publisher'))],
      ]} />
    </>
  );
}

// Сортировка с направлением (?sort= и ?order=): «Издания», «Нехудожественная литература», «Произведения».
// Повторное нажатие на выбранную сортировку меняет направление; сортировка по умолчанию в обычном направлении
// в адрес не пишется.
export interface SortSpec<S extends string> { parse: (s: string | null) => S; byDefault: S; defaultOrder: (s: S) => SortOrder }
export function sortState<S extends string>(page: string, params: URLSearchParams, spec: SortSpec<S>) {
  const sort = spec.parse(params.get('sort'));
  const o = params.get('order');
  const order: SortOrder = o === 'asc' || o === 'desc' ? o : spec.defaultOrder(sort);
  const set = (p: URLSearchParams, s: S, so: SortOrder = spec.defaultOrder(s)) => {
    if (s === spec.byDefault) p.delete('sort'); else p.set('sort', s);
    if (so === spec.defaultOrder(s)) p.delete('order'); else p.set('order', so);
  };
  // выбранная сортировка — сменить направление, другая — включить её в обычном направлении
  const toggle = (p: URLSearchParams, s: S) => set(p, s, s === sort ? flipOrder(order) : spec.defaultOrder(s));
  // ссылка на этот же раздел с изменёнными параметрами (сортировка в адресе — в каноническом виде)
  const href = (mut: (p: URLSearchParams) => void) => hrefWith(page, params, (p) => { set(p, sort, order); mut(p); });
  // кнопка над списком: [ключ, подпись со стрелкой у выбранной, ссылка, подсказка]
  const item = (s: S, label: string): [string, string, string, string?] => (s === sort
    ? [s, `${label}${orderMark(order)}`, href((p) => toggle(p, s)), `${orderTitle(order)}; нажмите, чтобы ${orderTitle(flipOrder(order))}`]
    : [s, label, href((p) => toggle(p, s))]);
  // заголовок столбца таблицы: адрес меняется без новой записи в истории и без прокрутки наверх
  const onColumn = (c: S) => replaceParams(page, (p) => toggle(p, c));
  return { sort, order, toggle, href, item, onColumn };
}

// Кнопки сортировки над списком: [[ключ, подпись], …]
export function SortButtons<S extends string>({ state, items }: { state: ReturnType<typeof sortState<S>>; items: [S, string][] }) {
  return (
    <>
      <span className="ed-sort-label">Сортировка:</span>
      <SwitchGroup current={state.sort} items={items.map(([k, label]) => state.item(k, label))} />
    </>
  );
}

// Сортировка изданий: по умолчанию — по алфавиту, «по дате добавления» — новые сверху
const EDITION_SPEC: SortSpec<EditionSort> = { parse: editionSortOf, byDefault: 'title', defaultOrder };
export function editionSortState(page: string, params: URLSearchParams) {
  const st = sortState(page, params, EDITION_SPEC);
  const table: TableSort = { current: st.sort, order: st.order, onSort: (c: TableColumn) => st.onColumn(c) };
  return { ...st, table };
}

export function EditionSortSwitch({ page, params }: { page: string; params: URLSearchParams }) {
  return <SortButtons state={editionSortState(page, params)} items={[
    ['title', 'по алфавиту'], ['year', 'по году издания'], ['publisher', 'по издательству'], ['added', 'по дате добавления'],
  ]} />;
}
