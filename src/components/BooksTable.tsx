// Таблица изданий; groups — [[заголовок группы или null, книги], …].
// С sort заголовки столбцов — кнопки сортировки (как в таблице «Произведений»): повторное нажатие меняет направление.
import { useCatalog } from '../context';
import { SeriesText, authorsNames } from './links';
import type { Book } from '../types';
import type { SortOrder } from '../lib/grouping';

export type TableColumn = 'title' | 'author' | 'publisher' | 'year' | 'series';
export interface TableSort { current: string; order: SortOrder; onSort: (column: TableColumn) => void }

const COLUMNS: [TableColumn, string, string][] = [
  ['title', 'Название', ''], ['author', 'Автор', ''], ['publisher', 'Издательство', 'hide-sm'], ['year', 'Год', 'num'], ['series', 'Серия', 'hide-sm'],
];
export const orderMark = (o: SortOrder): string => (o === 'asc' ? ' ▴' : ' ▾');
export const orderTitle = (o: SortOrder): string => (o === 'asc' ? 'по возрастанию' : 'по убыванию');

export function BooksTable({ groups, groupId = () => '', sort }: { groups: [string | null, Book[]][]; groupId?: (g: string) => string; sort?: TableSort }) {
  const m = useCatalog();
  const th = ([k, label, cls]: [TableColumn, string, string]) => {
    if (!sort) return <th key={k} className={cls || undefined}>{label}</th>;
    const on = sort.current === k;
    return (
      <th key={k} className={cls || undefined} aria-sort={on ? (sort.order === 'asc' ? 'ascending' : 'descending') : undefined}>
        <button type="button" data-ed-sort={k} title={on ? `${orderTitle(sort.order)}; нажмите, чтобы ${orderTitle(sort.order === 'asc' ? 'desc' : 'asc')}` : undefined}
          onClick={() => sort.onSort(k)}>{`${label}${on ? orderMark(sort.order) : ''}`}</button>
      </th>
    );
  };
  return (
    <table className="list ed-table">
      <thead><tr>{COLUMNS.map(th)}</tr></thead>
      {groups.map(([g, list], i) => (
        <tbody key={i}>
          {g && <tr className="grp" id={groupId(g)}><th colSpan={5}>{g}</th></tr>}
          {list.map((b) => (
            <tr key={b.id}>
              <td><a href={`#/book/${b.id}`}>{b.title_ru}</a></td>
              <td>{authorsNames(m, b) || '—'}</td>
              <td className="hide-sm">{[b.publisher, b.city].filter(Boolean).join(', ') || '—'}</td>
              <td className="num">{b.year || '—'}</td>
              <td className="hide-sm">{m.seriesOf(b) ? <SeriesText book={b} /> : '—'}</td>
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}
