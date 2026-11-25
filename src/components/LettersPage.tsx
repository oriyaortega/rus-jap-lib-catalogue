// Перечень людей по алфавиту (авторы, переводчики): карточки или текстовый список.
// Рисуется постепенно; переход по букве дорисовывает список до этой буквы.
import type { ReactNode } from 'react';
import { PeopleDeck, lifeYears } from './cards';
import { SectionTitle } from './common';
import { JumpNav } from './JumpNav';
import { Legend } from './Legend';
import { SwitchGroup, viewOf } from './switches';
import { useProgressive } from '../hooks/useProgressive';
import { groupRuns, letterOf, sortPeople } from '../lib/grouping';
import { PORTION, groupStarts, takeGroups } from '../lib/progressive';
import type { PersonInfo } from '../types';

interface Props {
  title: string;
  sub: string;
  people: PersonInfo[];
  hrefBase: 'author' | 'translator';
  prefix: string;
  extra: (p: PersonInfo) => ReactNode;
  params: URLSearchParams;
}

export function LettersPage({ title, sub, people, hrefBase, prefix, extra, params }: Props) {
  const sorted = sortPeople(people);
  const asList = viewOf(params) === 'list';
  const groups = groupRuns(sorted, letterOf);
  const starts = groupStarts(groups);
  const lazy = useProgressive(sorted.length, asList ? PORTION.rows : PORTION.peopleCards, `${hrefBase}:${asList}`);
  // Буква-отметка встаёт в ряд перед первой карточкой на эту букву
  const firstOfLetter = new Set(groups.map(([, ps]) => ps[0]));
  const marker = (p: PersonInfo) => {
    if (!firstOfLetter.has(p)) return null;
    const L = letterOf(p);
    return <div className="letter-mark" id={`${prefix}-${L}`} aria-hidden="true"><span>{L}</span></div>;
  };
  return (
    <>
      <h1>{title}</h1>
      <p className="sub">{sub}</p>
      <JumpNav href={`#/${hrefBase}s`} onJump={lazy.reveal}
        items={groups.map(([L], i) => ({ label: L, target: `${prefix}-${L}`, index: starts[i] }))} />
      <SwitchGroup label="Вид" current={asList ? 'list' : 'cards'} items={[
        ['cards', 'Карточки', `#/${hrefBase}s`],
        ['list', 'Список', `#/${hrefBase}s?view=list`],
      ]} />
      <SectionTitle>По алфавиту</SectionTitle>
      {asList
        ? <PeopleList groups={takeGroups(groups, lazy.limit)} hrefBase={hrefBase} prefix={prefix} extra={extra} />
        // легенда эпох нужна только авторам: у всех переводчиков кайма одного цвета
        : <>{hrefBase === 'author' && <Legend kind="era" />}<PeopleDeck people={sorted.slice(0, lazy.limit)} hrefBase={hrefBase} extra={extra} marker={marker} /></>}
      {lazy.sentinel}
    </>
  );
}

// Текстовый список имён по буквам
function PeopleList({ groups, hrefBase, prefix, extra }: { groups: [string, PersonInfo[]][] } & Pick<Props, 'hrefBase' | 'prefix' | 'extra'>) {
  return (
    <div className="name-list">
      {groups.map(([L, ps]) => (
        <section className="name-group" key={L}>
          <h3 id={`${prefix}-${L}`}>{L}</h3>
          <ul>
            {ps.map((p, i) => (
              <li key={`${p.id}-${i}`}>
                <a href={`#/${hrefBase}/${p.id}`}>{p.name_ru}</a>
                {p.orig && p.orig !== p.name_ru && <>{' '}<span className="o" lang={p.kanji ? 'ja' : undefined}>{p.orig}</span></>}
                {lifeYears(p.w) && <>{' '}<span className="y">{lifeYears(p.w)}</span></>}
                {extra && <span className="x">{extra(p)}</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
