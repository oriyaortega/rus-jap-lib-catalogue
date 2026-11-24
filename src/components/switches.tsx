// Переключатели вида («Карточки / Список») и сортировки книг
import { hrefWith } from '../router';
import type { BookSort } from '../lib/model';

export function SwitchGroup({ items, current, label }: { items: [string, string, string][]; current: string; label?: string }) {
  return (
    <div className="view-switch" role="group" aria-label={label}>
      {items.map(([k, text, href]) => <a key={k} href={href} aria-current={k === current ? 'true' : undefined}>{text}</a>)}
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
