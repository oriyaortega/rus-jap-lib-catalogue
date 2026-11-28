// Нехудожественная литература: темы (свёрнутым блоком), вид и сортировка — как в «Изданиях», одним списком без разделов по жанру.
// Жанр показан цветом каймы карточки (легенда над карточками). Сортировка — кнопками над списком или заголовками
// столбцов таблицы, повторное нажатие меняет направление; группы — по букве, году, издательству и т. д.,
// по алфавиту и по автору — с переходом по буквам.
import { Fragment } from 'react';
import { GroupHeading } from '../components/common';
import { useCatalog } from '../context';
import { BookDeck } from '../components/cards';
import { BooksTable } from '../components/BooksTable';
import { JumpNav } from '../components/JumpNav';
import { Legend } from '../components/Legend';
import { EditionSortSwitch, ViewSwitch, editionSortState, viewOf } from '../components/switches';
import { TOPIC_TAGS, TYPE_TAGS } from '../lib/tags';
import { useProgressive } from '../hooks/useProgressive';
import { PORTION, groupStarts, takeGroups } from '../lib/progressive';
import { editionComparator, editionGroupId, editionGroupOf, groupRuns } from '../lib/grouping';
import { collator, plural } from '../lib/text';

export function NonfictionPage({ params }: { params: URLSearchParams }) {
  const m = useCatalog();
  const { sort, order, table, href } = editionSortState('nonfiction', params);
  const keys = m.editionKeys;
  const books = m.catalog.books.filter((b) => b.tags.includes('нехудожественная')).sort(editionComparator(sort, order, keys));
  const groups = groupRuns(books, editionGroupOf(sort, keys));
  const starts = groupStarts(groups);
  const topics = [...new Set([...books.flatMap((b) => b.tags.filter((t) => !TYPE_TAGS.includes(t))), ...TOPIC_TAGS])].sort((a, b) => collator.compare(a, b));
  const nTopic = (t: string) => books.filter((b) => b.tags.includes(t)).length;
  const asList = viewOf(params) === 'list';
  const lazy = useProgressive(books.length, asList ? PORTION.rows : PORTION.bookCards, params.toString());
  const shown = takeGroups(groups, lazy.limit);
  return (
    <>
      <h1>Нехудожественная литература</h1>
      <p className="sub">{`исследования, очерки, справочные издания о Японии · ${plural(books.length, ['издание', 'издания', 'изданий'])}`}</p>
      {/* темы свёрнуты, как выбор года в «Изданиях»; тема открывает поиск по ней */}
      <details className="year-filter">
        <summary>Выбрать тему</summary>
        <div className="tagcloud">
          {topics.map((t) => {
            const n = nTopic(t);
            return n
              ? <a key={t} href={`#/search?tags=${encodeURIComponent('нехудожественная,' + t)}${asList ? '&view=list' : ''}`}>{`${t} · ${n}`}</a>
              : <span key={t} className="tag-off">{`${t} · 0`}</span>;
          })}
        </div>
      </details>
      <div className="ed-controls"><ViewSwitch page="nonfiction" params={params} /><EditionSortSwitch page="nonfiction" params={params} /></div>
      {!asList && <Legend kind="genre" books={books} />}
      {(sort === 'title' || sort === 'author') && <JumpNav href={href(() => {})} onJump={lazy.reveal}
        items={groups.flatMap(([g], i) => (g.length > 3 ? [] : [{ label: g, target: editionGroupId(g), index: starts[i] }]))} />}
      {asList
        ? <BooksTable groups={shown} groupId={editionGroupId} sort={table} counts={groups.map(([, l]) => l.length)} />
        : shown.map(([g, list], i) => (
          <Fragment key={i}>
            {/* в заголовке — число книг всей группы, даже если она отрисована не целиком */}
            <GroupHeading id={editionGroupId(g)} label={g} count={groups[i][1].length} />
            <BookDeck books={list} />
          </Fragment>
        ))}
      {lazy.sentinel}
    </>
  );
}
