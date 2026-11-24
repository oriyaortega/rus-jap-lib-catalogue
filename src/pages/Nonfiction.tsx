// Нехудожественная литература: разделы по жанру, темы, вид и сортировка
import { Fragment } from 'react';
import { useCatalog } from '../context';
import { BookDeck } from '../components/cards';
import { BooksTable } from '../components/BooksTable';
import { SectionTitle } from '../components/common';
import { SortSwitch, ViewSwitch, sortOf, viewOf } from '../components/switches';
import { TOPIC_TAGS, TYPE_TAGS } from '../lib/tags';
import { nonfictionGroups, nonfictionTitle } from '../lib/grouping';
import { collator, plural } from '../lib/text';

export function NonfictionPage({ params }: { params: URLSearchParams }) {
  const m = useCatalog();
  const books = m.catalog.books.filter((b) => b.tags.includes('нехудожественная'));
  const groups = nonfictionGroups(books, m.bookSorts[sortOf(params)]);
  const topics = [...new Set([...books.flatMap((b) => b.tags.filter((t) => !TYPE_TAGS.includes(t))), ...TOPIC_TAGS])].sort((a, b) => collator.compare(a, b));
  const nTopic = (t: string) => books.filter((b) => b.tags.includes(t)).length;
  const asList = viewOf(params) === 'list';
  return (
    <>
      <h1>Нехудожественная литература</h1>
      <p className="sub">{`исследования, очерки, справочные издания о Японии · ${plural(books.length, ['книга', 'книги', 'книг'])}`}</p>
      <div className="tagcloud">
        <span className="grp">Темы</span>
        {topics.map((t) => {
          const n = nTopic(t);
          return n
            ? <a key={t} href={`#/search?tags=${encodeURIComponent('нехудожественная,' + t)}${asList ? '&view=list' : ''}`}>{`${t} · ${n}`}</a>
            : <span key={t} className="tag-off">{`${t} · 0`}</span>;
        })}
      </div>
      <div className="ed-controls"><ViewSwitch page="nonfiction" params={params} /><SortSwitch page="nonfiction" params={params} /></div>
      {groups.map(([g, list]) => (
        <Fragment key={g}>
          <SectionTitle>{asList ? `${nonfictionTitle(g)} · ${list.length}` : nonfictionTitle(g)}</SectionTitle>
          {asList ? <BooksTable groups={[[null, list]]} /> : <BookDeck books={list} />}
        </Fragment>
      ))}
    </>
  );
}
