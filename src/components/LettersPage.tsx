// Перечень людей (авторы, переводчики): карточки или текстовый список, сортировка.
// Порядок блоков — как в остальных перечнях: вид и сортировка → легенда → буквы → записи.
// По алфавиту — разбивка на буквы с заголовком «А 44» и переход по ним; рисуется постепенно,
// переход по букве дорисовывает список до этой буквы.
import { Fragment, type ReactNode } from 'react';
import { PeopleDeck, lifeYears } from './cards';
import { GroupHeading } from './common';
import { JumpNav } from './JumpNav';
import { Legend } from './Legend';
import { SortButtons, ViewSwitch, sortState, viewOf, type SortSpec } from './switches';
import { useProgressive } from '../hooks/useProgressive';
import { groupRuns, letterOf } from '../lib/grouping';
import { type PeopleSort, peopleDefaultOrder, peopleSortOf, sortPeopleBy } from '../lib/peopleList';
import { PORTION, groupStarts, takeGroups } from '../lib/progressive';
import type { PersonInfo } from '../types';

// без сортировки по году рождения (переводчики) ?sort=born означает «по алфавиту»
const peopleSpec = (born: boolean): SortSpec<PeopleSort> => ({
  parse: (s) => { const v = peopleSortOf(s); return !born && v === 'born' ? 'name' : v; },
  byDefault: 'name', defaultOrder: peopleDefaultOrder,
});

interface Props {
  title: string;
  sub: string;
  people: PersonInfo[];
  hrefBase: 'author' | 'translator';
  prefix: string;
  extra: (p: PersonInfo) => ReactNode;
  count: (p: PersonInfo) => number;     // число изданий (переводов) — для сортировки
  countLabel: string;                   // подпись кнопки этой сортировки
  bornSort?: boolean;                   // сортировка по году рождения
  params: URLSearchParams;
}

export function LettersPage({ title, sub, people, hrefBase, prefix, extra, count, countLabel, bornSort, params }: Props) {
  const page = `${hrefBase}s`;
  const st = sortState(page, params, peopleSpec(!!bornSort));
  const { sort } = st;
  const asList = viewOf(params) === 'list';
  const sorted = sortPeopleBy(people, sort, st.order, count);
  const groups: [string | null, PersonInfo[]][] = sort === 'name' ? groupRuns(sorted, letterOf) : [[null, sorted]];
  const starts = groupStarts(groups);
  const lazy = useProgressive(sorted.length, asList ? PORTION.rows : PORTION.peopleCards, `${hrefBase}:${params.toString()}`);
  const shown = takeGroups(groups, lazy.limit);
  const id = (L: string) => `${prefix}-${L}`;
  return (
    <>
      <h1>{title}</h1>
      <p className="sub">{sub}</p>
      <div className="ed-controls">
        <ViewSwitch page={page} params={params} />
        <SortButtons state={st} items={[['name', 'по алфавиту'], ['books', countLabel], ...(bornSort ? [['born', 'по году рождения'] as [PeopleSort, string]] : [])]} />
      </div>
      {/* легенда эпох нужна только авторам: у всех переводчиков кайма одного цвета */}
      {!asList && hrefBase === 'author' && <Legend kind="era" />}
      {sort === 'name' && <JumpNav href={st.href(() => {})} onJump={lazy.reveal}
        items={groups.map(([L], i) => ({ label: L as string, target: id(L as string), index: starts[i] }))} />}
      {shown.map(([L, ps], i) => (
        <Fragment key={L ?? i}>
          {asList
            ? <PeopleList letter={L} total={groups[i][1].length} id={L ? id(L) : undefined} people={ps} hrefBase={hrefBase} extra={extra} />
            : <>
              {/* в заголовке — число людей всей буквы, даже если она отрисована не целиком */}
              {L && <GroupHeading id={id(L)} label={L} count={groups[i][1].length} />}
              <PeopleDeck people={ps} hrefBase={hrefBase} extra={extra} />
            </>}
        </Fragment>
      ))}
      {lazy.sentinel}
    </>
  );
}

// Текстовый список имён одной буквы; заголовок буквы — такой же полосой, как в таблицах
function PeopleList({ letter, total, id, people, hrefBase, extra }: {
  letter: string | null; total: number; id?: string; people: PersonInfo[]; hrefBase: string; extra: (p: PersonInfo) => ReactNode;
}) {
  return (
    <section className="name-group">
      {letter && <h3 className="grp-band" id={id}>{`${letter} `}<span>{total}</span></h3>}
      <ul>
        {people.map((p, i) => (
          <li key={`${p.id}-${i}`}>
            <a href={`#/${hrefBase}/${p.id}`}>{p.name_ru}</a>
            {p.orig && p.orig !== p.name_ru && <>{' '}<span className="o" lang={p.kanji ? 'ja' : undefined}>{p.orig}</span></>}
            {lifeYears(p.w) && <>{' '}<span className="y">{lifeYears(p.w)}</span></>}
            {extra && <span className="x">{extra(p)}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
