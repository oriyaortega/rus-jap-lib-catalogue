// Произведения: японские и неяпонские авторы, поиск, фильтр по виду, сортировка по столбцам
import { useCatalog } from '../context';
import { SectionTitle, Join } from '../components/common';
import { AuthorLink } from '../components/links';
import { WorkTitleLink } from '../components/WorksList';
import { replaceParams } from '../router';
import { collator, plural } from '../lib/text';
import { filterWorks, workComparator, workYear } from '../lib/works';
import type { Work } from '../types';

export function WorksPage({ params }: { params: URLSearchParams }) {
  const m = useCatalog();
  const sort = params.get('sort') || 'author';
  const q = params.get('q') || '';
  const kind = params.get('kind') || '';
  const all = m.catalog.works || [];
  const kinds = [...new Set(all.map((w) => w.kind).filter((k): k is string => !!k))].sort((a, b) => collator.compare(a, b));
  const rows = filterWorks(all, q, kind, (a) => m.authorInfo(a).name_ru)
    .sort(workComparator(sort, (w) => m.authorsById.get(w.authors[0])?.sort || ''));
  const jp = rows.filter((w) => !w.foreign), fr = rows.filter((w) => w.foreign);
  const nJp = all.filter((w) => !w.foreign).length, nFr = all.length - nJp;

  const th = (k: string, label: string, cls = '') => (
    <th key={k} className={cls}><button type="button" data-works-sort={k} onClick={() => replaceParams('works', (p) => p.set('sort', k))}>{`${label}${sort === k ? ' ▾' : ''}`}</button></th>
  );
  const table = (list: Work[], foreign: boolean) => (list.length ? (
    <table className="list">
      <thead><tr>{th('title', 'Название')}<th className="hide-sm">Оригинал</th>{th('author', 'Автор')}{th('year', 'Год', 'num')}{foreign && <th className="hide-sm">Язык</th>}{th('kind', 'Вид')}</tr></thead>
      <tbody>
        {list.map((w) => (
          <tr key={w.id}>
            <td><WorkTitleLink work={w} /></td>
            <td className="hide-sm" lang={foreign ? undefined : 'ja'}>{w.title_orig || w.title_romaji || '—'}</td>
            <td>{w.authors.length ? <Join items={w.authors.map((a) => <AuthorLink key={a} id={a} />)} /> : '—'}</td>
            <td className="num">{workYear(w.year)}</td>
            {foreign && <td className="hide-sm">{w.lang || '—'}</td>}
            <td>{w.kind || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : <p className="muted">Ничего не найдено.</p>);

  return (
    <>
      <h1>Произведения</h1>
      <p className="sub">{`художественные произведения на русском языке · ${plural(all.length, ['произведение', 'произведения', 'произведений'])} · по данным Фантлаба, картотеки и издательств`}</p>
      <form className="searchbar" id="works-form" onSubmit={(e) => e.preventDefault()}>
        <input id="wq" type="search" value={q} placeholder="Название, автор или иероглифы" aria-label="Поиск по произведениям" autoComplete="off"
          onChange={(e) => replaceParams('works', (p) => p.set('q', e.target.value))} />
        <select id="wkind" aria-label="Вид произведения" value={kind} onChange={(e) => replaceParams('works', (p) => p.set('kind', e.target.value))}>
          <option value="">все виды</option>
          {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </form>
      <SectionTitle>{`Японские авторы · ${jp.length === nJp ? nJp : `${jp.length} из ${nJp}`}`}</SectionTitle>
      {table(jp, false)}
      <SectionTitle>{`Неяпонские авторы · ${fr.length === nFr ? nFr : `${fr.length} из ${nFr}`}`}</SectionTitle>
      {table(fr, true)}
    </>
  );
}
