// Страница произведения: карточка и выходные данные, издания каталога, все публикации на русском (по данным Фантлаба)
import type { MouseEvent, ReactNode } from 'react';
import { useCatalog } from '../context';
import { BookDeck, WorkFuda } from '../components/cards';
import { ExtLink, FactTable, Join, SectionTitle } from '../components/common';
import { AuthorLink, TranslatorLink } from '../components/links';
import { useWorkEditions } from '../hooks/useWorkEditions';
import { plural } from '../lib/text';
import { workYear } from '../lib/works';
import { catalogBooksOfWork, editionsOf, publicationText, sortPublications, translatorIndex, workTranslatorIds } from '../lib/workPage';
import { NotFound } from './NotFound';
import type { WorkPublication } from '../types';

const back = (e: MouseEvent) => { e.preventDefault(); history.back(); };

export function WorkPage({ id }: { id: string }) {
  const m = useCatalog();
  const eds = useWorkEditions();
  const w = m.work(id);
  if (!w) return <NotFound />;
  const info = eds.status === 'ok' ? editionsOf(eds.data, w) : null;
  const pubs = sortPublications(info?.pubs || []);
  const books = catalogBooksOfWork(w, (a) => m.booksOf(a), (b) => m.book(b), pubs, m.catalog.books);
  const findTr = translatorIndex(m.catalog.translators);
  const [orig, romajiFl] = (w.title_orig || '').split(' / ');
  const romaji = w.title_romaji || romajiFl;
  const lang = w.foreign ? undefined : 'ja';

  // переводчики: из каталога (содержание сборников, само произведение) и с Фантлаба; известные каталогу — ссылками
  const ids = new Set(workTranslatorIds(w, books));
  const unknown: string[] = [];
  for (const n of info?.tr || []) { const t = findTr(n); if (t) ids.add(t.id); else unknown.push(n); }
  const trItems: ReactNode[] = [...[...ids].map((t) => <TranslatorLink id={t} full />), ...unknown];

  const rows = ([
    w.authors.length > 0 && [w.authors.length > 1 ? 'Авторы' : 'Автор', <Join items={w.authors.map((aid) => {
      const a = m.authorInfo(aid);
      return <><AuthorLink id={aid} />{a.kanji && <>{' '}<span lang="ja">{a.kanji}</span></>}</>;
    })} />],
    orig && ['Оригинал', <><span lang={lang}>{orig}</span>{romaji && <> (<i>{romaji}</i>)</>}</>],
    w.kind && ['Вид', w.kind],
    w.year != null && ['Год создания', workYear(w.year)],
    w.lang && ['Язык оригинала', w.lang],
    trItems.length > 0 && ['Перевод', <Join items={trItems} />],
    info?.titles?.length && ['Другие названия', info.titles.join('; ')],
    ['Изданий в каталоге', books.length ? books.length : <span className="muted">нет</span>],
    w.fantlab && ['Источник', <ExtLink href={`https://fantlab.ru/work${w.fantlab}`}>Фантлаб</ExtLink>],
  ] as ([string, ReactNode] | false | null | undefined | 0 | '')[]).filter((r): r is [string, ReactNode] => !!r);

  return (
    <>
      <div className="profile">
        <WorkFuda work={w} />
        <div>
          <h1>{w.title_ru}</h1>
          {orig && <p className="orig" lang={lang}>{orig}</p>}
          <FactTable rows={rows} />
        </div>
      </div>
      {books.length > 0 && <>
        <SectionTitle>{`В каталоге · ${plural(books.length, ['издание', 'издания', 'изданий'])}`}</SectionTitle>
        <BookDeck books={books} />
      </>}
      {pubs.length > 0 && <>
        <SectionTitle>{`Публикации на русском · ${pubs.length}`}</SectionTitle>
        <p className="muted small">по данным Фантлаба</p>
        <ul className="ed-list pubs">{pubs.map((p, i) => <Publication key={i} pub={p} />)}</ul>
      </>}
      {eds.status === 'loading' && w.fantlab && <p className="muted">Загрузка публикаций…</p>}
      {eds.status !== 'loading' && !books.length && !pubs.length && <p className="muted">Сведений об изданиях на русском пока нет.</p>}
      <p className="back"><a href="#" onClick={back}>← назад</a></p>
    </>
  );
}

function Publication({ pub: p }: { pub: WorkPublication }) {
  const title = `«${p.title}»`;
  const imprint = publicationText(p);
  return (
    <li>
      {p.kind === 'журнал' && 'журнал '}
      {p.book ? <a href={`#/book/${p.book}`}>{title}</a> : <ExtLink href={`https://fantlab.ru/edition${p.fl}`}>{title}</ExtLink>}
      {imprint && `; ${imprint}`}
      {p.tr?.length ? ` (пер. ${p.tr.join(', ')})` : ''}
      {p.book && <span className="in-cat"> · в каталоге</span>}
    </li>
  );
}
