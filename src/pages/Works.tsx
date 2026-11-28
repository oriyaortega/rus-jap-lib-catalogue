// Произведения: один список карточками или таблицей; фильтр по авторам (японские / неяпонские) и по виду.
// Сортировка — как в «Нехудожественной литературе»: кнопками над списком (по алфавиту, году создания, автору)
// или заголовками столбцов таблицы (ещё по виду); повторное нажатие меняет направление (?order=asc|desc).
// По алфавиту и по автору — разбивка на буквы и переход по ним, как в «Изданиях».
import { Fragment } from 'react';
import { useCatalog } from '../context';
import { GroupHeading, Join } from '../components/common';
import { WorkDeck } from '../components/cards';
import { Legend } from '../components/Legend';
import { AuthorLink } from '../components/links';
import { orderMark, orderTitle } from '../components/BooksTable';
import { SortButtons, ViewSwitch, sortState, viewOf, type SortSpec } from '../components/switches';
import { WorkTitleLink } from '../components/WorksList';
import { useProgressive } from '../hooks/useProgressive';
import { PORTION, takeGroups } from '../lib/progressive';
import { flipOrder, letterRuns } from '../lib/grouping';
import { JumpNav } from '../components/JumpNav';
import { replaceParams } from '../router';
import { collator, plural, titleKey } from '../lib/text';
import { type WorkSort, filterWorks, workComparator, workSortOf, workYear } from '../lib/works';
import type { Work } from '../types';

const WORK_SPEC: SortSpec<WorkSort> = { parse: workSortOf, byDefault: 'title', defaultOrder: () => 'asc' };
const WORKS_WORD: [string, string, string] = ['произведение', 'произведения', 'произведений'];

export function WorksPage({ params }: { params: URLSearchParams }) {
  const m = useCatalog();
  const st = sortState('works', params, WORK_SPEC);
  const { sort, order } = st;
  const asList = viewOf(params) === 'list';
  const kind = params.get('kind') || '';
  // авторы: '' — все, jp — японские, fr — неяпонские
  const origin = params.get('orig') === 'jp' || params.get('orig') === 'fr' ? params.get('orig') : '';
  const all = m.catalog.works || [];
  const kinds = [...new Set(all.map((w) => w.kind).filter((k): k is string => !!k))].sort((a, b) => collator.compare(a, b));
  const firstSort = (w: Work) => m.authorsById.get(w.authors[0])?.sort || '';
  const rows = filterWorks(all, '', kind, (a) => m.authorInfo(a).name_ru)
    .filter((w) => !origin || (origin === 'fr') === !!w.foreign)
    .sort(workComparator(sort, firstSort, order));
  const lazy = useProgressive(rows.length, asList ? PORTION.rows : PORTION.bookCards, params.toString());
  // ключ букв — тот же, что у сортировки (workComparator)
  const letterKey = sort === 'title' ? (w: Work) => titleKey(w.title_ru) : sort === 'author' ? firstSort : null;
  const lr = letterKey ? letterRuns(rows, letterKey, 'W') : null;
  const groups: [string | null, Work[]][] = lr ? lr.groups : [[null, rows]];
  const shown = takeGroups(groups, lazy.limit);
  const id = lr ? lr.id : String;
  // столбец «Язык» — только если в списке есть неяпонские авторы
  const withLang = rows.some((w) => w.foreign);

  const th = (k: WorkSort, label: string, cls = '') => {
    const on = sort === k;
    return (
      <th key={k} className={cls || undefined} aria-sort={on ? (order === 'asc' ? 'ascending' : 'descending') : undefined}>
        <button type="button" data-works-sort={k} title={on ? `${orderTitle(order)}; нажмите, чтобы ${orderTitle(flipOrder(order))}` : undefined}
          onClick={() => st.onColumn(k)}>{`${label}${on ? orderMark(order) : ''}`}</button>
      </th>
    );
  };
  const table = (
    <table className="list">
      <thead><tr>{th('title', 'Название')}<th className="hide-sm">Оригинал</th>{th('author', 'Автор')}{th('year', 'Год', 'num')}{withLang && <th className="hide-sm">Язык</th>}{th('kind', 'Вид')}</tr></thead>
      {shown.map(([g, list], gi) => (<tbody key={gi}>
        {/* в заголовке — число произведений всей буквы, даже если она отрисована не целиком */}
        {g && <tr className="grp" id={id(g)}><th colSpan={withLang ? 6 : 5}>{`${g} `}<span>{groups[gi][1].length}</span></th></tr>}
        {list.map((w) => (
          <tr key={w.id}>
            <td><WorkTitleLink work={w} /></td>
            <td className="hide-sm" lang={w.foreign ? undefined : 'ja'}>{w.title_orig || w.title_romaji || '—'}</td>
            <td>{w.authors.length ? <Join items={w.authors.map((a) => <AuthorLink key={a} id={a} />)} /> : '—'}</td>
            <td className="num">{workYear(w.year)}</td>
            {withLang && <td className="hide-sm">{w.foreign ? w.lang || '—' : 'японский'}</td>}
            <td>{w.kind || '—'}</td>
          </tr>
        ))}
      </tbody>))}
    </table>
  );
  const filtered = rows.length !== all.length;

  return (
    <>
      <h1>Произведения</h1>
      <p className="sub">{`художественные произведения на русском языке · ${plural(all.length, WORKS_WORD)}${filtered ? ` · найдено ${rows.length}` : ''}`}</p>
      <form className="searchbar" id="works-form" onSubmit={(e) => e.preventDefault()}>
        <select id="worig" aria-label="Авторы" value={origin || ''} onChange={(e) => replaceParams('works', (p) => p.set('orig', e.target.value))}>
          <option value="">все авторы</option>
          <option value="jp">японские авторы</option>
          <option value="fr">неяпонские авторы</option>
        </select>
        <select id="wkind" aria-label="Вид произведения" value={kind} onChange={(e) => replaceParams('works', (p) => p.set('kind', e.target.value))}>
          <option value="">все виды</option>
          {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </form>
      <div className="ed-controls">
        <ViewSwitch page="works" params={params} />
        <SortButtons state={st} items={[['title', 'по алфавиту'], ['year', 'по году создания'], ['author', 'по автору']]} />
      </div>
      {!asList && <Legend kind="work" />}
      {lr && <JumpNav href={st.href(() => {})} onJump={lazy.reveal} items={lr.nav} />}
      {!rows.length ? <p className="muted">Ничего не найдено.</p>
        : asList ? table
          : shown.map(([g, list], i) => (
            <Fragment key={i}>
              {g && <GroupHeading id={id(g)} label={g} count={groups[i][1].length} />}
              <WorkDeck works={list} />
            </Fragment>
          ))}
      {lazy.sentinel}
    </>
  );
}
