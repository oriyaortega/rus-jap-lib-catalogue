// Таблица изданий; groups — [[заголовок группы или null, книги], …]
import { useCatalog } from '../context';
import { SeriesText, authorsNames } from './links';
import type { Book } from '../types';

export function BooksTable({ groups, groupId = () => '' }: { groups: [string | null, Book[]][]; groupId?: (g: string) => string }) {
  const m = useCatalog();
  return (
    <table className="list ed-table">
      <thead><tr><th>Название</th><th>Автор</th><th className="hide-sm">Издательство</th><th className="num">Год</th><th className="hide-sm">Серия</th></tr></thead>
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
