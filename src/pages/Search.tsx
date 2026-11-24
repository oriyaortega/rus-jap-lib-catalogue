// Поиск: текст (по нормализованному индексу) и теги; вид и сортировка как в разделах
import { useCatalog } from '../context';
import { BookDeck } from '../components/cards';
import { BooksTable } from '../components/BooksTable';
import { Legend } from '../components/Legend';
import { SortSwitch, ViewSwitch, sortOf, viewOf } from '../components/switches';
import { useProgressive } from '../hooks/useProgressive';
import { PORTION } from '../lib/progressive';
import { replaceParams } from '../router';
import { parseTags, tagCloud, tagCounts, toggleTag, tokenize } from '../lib/tags';

export function SearchPage({ params }: { params: URLSearchParams }) {
  const m = useCatalog();
  const q = params.get('q') || '';
  const tags = parseTags(params.get('tags'));
  const tokens = tokenize(q);
  const found = m.catalog.books.filter((b) => [...tags].every((t) => b.tags.includes(t)) && m.matches(b, tokens)).sort(m.bookSorts[sortOf(params)]);
  const counts = tagCounts(found);
  const cloud = tagCloud(m.catalog.books);
  const asList = viewOf(params) === 'list';
  // найденное рисуется постепенно; новый запрос, теги, вид или сортировка — снова с первой порции
  const lazy = useProgressive(found.length, asList ? PORTION.rows : PORTION.bookCards, params.toString());
  const shown = found.slice(0, lazy.limit);

  const tagButton = (t: string) => {
    const n = counts.get(t) || 0, on = tags.has(t);
    return (
      <button key={t} type="button" data-tag={t} aria-pressed={on} disabled={!n && !on}
        onClick={() => replaceParams('search', (p) => p.set('tags', toggleTag(p.get('tags'), t)))}>{`${t} · ${n}`}</button>
    );
  };

  return (
    <>
      <h1>Поиск</h1>
      <p className="sub">по автору, названию, иероглифам, ромадзи, переводчику, издательству</p>
      <form className="searchbar" id="search-form" onSubmit={(e) => e.preventDefault()}>
        <input id="q" type="search" value={q} placeholder="Например: Мишима, 雪国, Murakami, Маркова" aria-label="Поиск" autoComplete="off"
          onChange={(e) => replaceParams('search', (p) => p.set('q', e.target.value))} />
      </form>
      <div className="tagcloud">
        <span className="grp">Тип</span>{cloud.type.map(tagButton)}
        <span className="grp">Теги</span>{cloud.other.map(tagButton)}
      </div>
      <div className="ed-controls">
        <p className="found" style={{ margin: 0 }}>{`Найдено: ${found.length} из ${m.catalog.books.length}`}</p>
        <ViewSwitch page="search" params={params} />
        <SortSwitch page="search" params={params} />
      </div>
      {!found.length ? <p>Ничего не найдено. Попробуйте снять часть тегов.</p>
        : asList ? <BooksTable groups={[[null, shown]]} /> : <><Legend kind="genre" /><BookDeck books={shown} /></>}
      {lazy.sentinel}
    </>
  );
}
