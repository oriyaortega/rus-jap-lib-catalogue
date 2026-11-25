// Страница книги: карточка, выходные данные, содержание сборника, другие издания
import type { MouseEvent, ReactNode } from 'react';
import { useCatalog } from '../context';
import { Fuda } from '../components/cards';
import { ExtLink, FactTable, Join, SectionTitle } from '../components/common';
import { AuthorLink, SeriesText, TranslatorLink } from '../components/links';
import { CONTENTS_COLLAPSE, bookSources, printRun } from '../lib/book';
import { sourceName } from '../lib/sources';
import { kanjiNum, plural } from '../lib/text';
import { NotFound } from './NotFound';
import type { Book, ContentItem } from '../types';

const back = (e: MouseEvent) => { e.preventDefault(); history.back(); };

export function BookPage({ id }: { id: string }) {
  const m = useCatalog();
  const b = m.book(id);
  if (!b) return <NotFound />;
  const no = m.bookNo.get(b.id)!;
  const sources = bookSources(b);
  const rows: [string, ReactNode][] = ([
    b.authors.length > 0 && [b.authors.length > 1 ? 'Авторы' : 'Автор', <Join items={b.authors.map((aid) => {
      const a = m.authorInfo(aid);
      return <><AuthorLink id={aid} />{a.kanji && <>{' '}<span lang="ja">{a.kanji}</span></>}</>;
    })} />],
    b.title_orig && ['Оригинал', <><span lang="ja">{b.title_orig}</span>{b.title_romaji && <> (<i>{b.title_romaji}</i>)</>}</>],
    b.orig_year && ['Год оригинала', b.orig_year],
    b.translators.length > 0 && ['Перевод', <Join items={b.translators.map((t) => <TranslatorLink id={t} full />)} />],
    b.city && ['Место издания', b.city],
    b.publisher && ['Издательство', b.publisher],
    ['Год издания', b.year ? <a href={`#/editions/${b.year}`}>{b.year}</a> : 'не указан'],
    b.pages && ['Страниц', b.pages],
    m.seriesOf(b) && ['Серия', <SeriesText book={b} />],
    ['ISBN', b.isbn ? b.isbn : <span className="muted">не указан</span>],
    b.print_run && ['Тираж', printRun(b.print_run)],
    ['Жанр', b.genre],
    ['Теги', <Join items={b.tags.map((t) => <a href={`#/search?tags=${encodeURIComponent(t)}`}>{t}</a>)} />],
    ['Карточка', <><span lang="ja">{kanjiNum(no)}</span>{` (№ ${no})`}</>],
    sources && ['Источник', <Join items={sources.map((s) => ('href' in s ? <ExtLink href={s.href}>{s.text}</ExtLink> : s.text))} />],
  ] as ([string, ReactNode] | false | null | undefined | 0 | '')[]).filter((r): r is [string, ReactNode] => !!r);

  return (
    <>
      <div className="profile">
        <Fuda book={b} />
        <div>
          <h1>{b.title_ru}</h1>
          {b.title_orig && <p className="orig" lang="ja">{b.title_orig}</p>}
          {b.work_note && <p>{b.work_note}</p>}
          <FactTable rows={rows} />
        </div>
      </div>
      <Contents book={b} />
      <OtherEditions book={b} />
      <p className="back"><a href="#" onClick={back}>← назад</a></p>
    </>
  );
}

function Contents({ book: b }: { book: Book }) {
  const items = b.contents || [];
  if (items.length <= 1) return null;
  const list = <ol className="contents">{items.map((w, i) => <ContentRow key={i} item={w} book={b} />)}</ol>;
  return (
    <>
      <SectionTitle>{`Содержание · ${items.length}`}</SectionTitle>
      {items.length > CONTENTS_COLLAPSE
        ? <details className="contents-more"><summary>{`Показать всё содержание (${plural(items.length, ['позиция', 'позиции', 'позиций'])})`}</summary>{list}</details>
        : list}
    </>
  );
}

function ContentRow({ item: w, book: b }: { item: ContentItem; book: Book }) {
  // автора произведения показываем, если он не единственный автор книги
  const showAuthor = w.a && (b.authors.length !== 1 || w.a !== b.authors[0]);
  // название — ссылка на страницу произведения
  const work = useCatalog().workOfItem(w);
  return (
    <li>
      <span className="w">
        {showAuthor && <AuthorLink id={w.a!} />}
        {showAuthor ? '. ' : w.at ? `${w.at}. ` : ''}
        {/* оригинальное название — на странице произведения, в содержании не повторяется */}
        {work ? <a href={`#/work/${work.id}`}>{w.t}</a> : w.t ?? ''}
      </span>
      {(w.k || w.tr.length > 0) && <>{' '}<span className="k">
        {`${w.k || ''}${w.k && w.tr.length > 0 ? ', ' : ''}${w.tr.length > 0 ? 'пер. ' : ''}`}
        {w.tr.length > 0 && <Join items={w.tr.map((t) => <TranslatorLink id={t} />)} />}
      </span></>}
      {w.p && <>{' '}<span className="pp">{`с. ${w.p}`}</span></>}
    </li>
  );
}

// Другие издания той же книги (поле editions): обложка и выходные данные
function OtherEditions({ book: b }: { book: Book }) {
  const m = useCatalog();
  const eds = b.editions || [];
  if (!eds.length) return null;
  return (
    <>
      <SectionTitle>{eds.length > 1 ? `Другие издания · ${eds.length}` : 'Другое издание'}</SectionTitle>
      {eds.map((e, i) => {
        const card = e.book ? m.bookNo.get(e.book) : undefined;
        const rows = ([
          e.title && ['Название', e.title],
          e.city && ['Место издания', e.city],
          e.publisher && ['Издательство', e.publisher],
          e.year && ['Год издания', <a href={`#/editions/${e.year}`}>{e.year}</a>],
          e.pages && ['Страниц', e.pages],
          e.isbn && ['ISBN', e.isbn],
          e.size && ['Формат', e.size],
          e.binding && ['Обложка', e.binding],
          e.note && ['Примечание', e.note],
          card && ['Карточка', <a href={`#/book/${e.book}`}><span lang="ja">{kanjiNum(card)}</span>{` (№ ${card})`}</a>],
          e.source && ['Источник', <ExtLink href={e.source}>{sourceName(e.source)}</ExtLink>],
        ] as ([string, ReactNode] | false | undefined | 0 | '')[]).filter((r): r is [string, ReactNode] => !!r);
        return (
          <div className="edition-other" key={i}>
            {e.cover ? <img className="ed-cover" src={e.cover} alt={`Обложка издания ${e.year || ''} года`} loading="lazy" referrerPolicy="no-referrer" /> : <div></div>}
            <FactTable rows={rows} />
          </div>
        );
      })}
    </>
  );
}
