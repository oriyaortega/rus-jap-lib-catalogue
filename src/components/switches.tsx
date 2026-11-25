// Переключатели вида («Карточки / Список») и сортировки книг
import { hrefWith, replaceParams } from '../router';
import type { BookSort } from '../lib/model';
import { type EditionSort, type SortOrder, defaultOrder, editionOrderOf, editionSortOf, flipOrder } from '../lib/grouping';
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

// Сортировка изданий («Издания», «Нехудожественная литература»): ?sort= и ?order=.
// Повторное нажатие на выбранную сортировку меняет направление; по умолчанию (по алфавиту, по возрастанию) параметров в адресе нет.
export function setEditionSort(p: URLSearchParams, s: EditionSort, o: SortOrder = defaultOrder(s)) {
  if (s === 'title') p.delete('sort'); else p.set('sort', s);
  if (o === defaultOrder(s)) p.delete('order'); else p.set('order', o);
}
export function editionSortState(page: string, params: URLSearchParams) {
  const sort = editionSortOf(params.get('sort'));
  const order = editionOrderOf(sort, params.get('order'));
  // выбранная сортировка — сменить направление, другая — включить её в обычном направлении
  const toggle = (p: URLSearchParams, s: EditionSort) => setEditionSort(p, s, s === sort ? flipOrder(order) : defaultOrder(s));
  // ссылка на этот же раздел с изменёнными параметрами (сортировка в адресе — в каноническом виде)
  const href = (mut: (p: URLSearchParams) => void) => hrefWith(page, params, (p) => { setEditionSort(p, sort, order); mut(p); });
  // заголовок столбца таблицы: адрес меняется без новой записи в истории и без прокрутки наверх, как в «Произведениях»
  const table: TableSort = { current: sort, order, onSort: (c: TableColumn) => replaceParams(page, (p) => toggle(p, c)) };
  return { sort, order, toggle, href, table };
}

export function EditionSortSwitch({ page, params }: { page: string; params: URLSearchParams }) {
  const { sort, order, toggle, href } = editionSortState(page, params);
  const item = (s: EditionSort, label: string): [string, string, string, string?] => (s === sort
    ? [s, `${label}${orderMark(order)}`, href((p) => toggle(p, s)), `${orderTitle(order)}; нажмите, чтобы ${orderTitle(flipOrder(order))}`]
    : [s, label, href((p) => toggle(p, s))]);
  return (
    <>
      <span className="ed-sort-label">Сортировка:</span>
      <SwitchGroup current={sort} items={[
        item('title', 'по алфавиту'),
        item('year', 'по году издания'),
        item('publisher', 'по издательству'),
        item('added', 'по дате добавления'),
      ]} />
    </>
  );
}
