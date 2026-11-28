// Карточки каруты: торифуда (книга) и ёмифуда (человек), колоды с подписями
import type { CSSProperties, ReactNode } from 'react';
import { useCatalog } from '../context';
import { genreColor, kindColor } from '../lib/colors';
import { kanjiNum } from '../lib/text';
import { SeriesText, TranslatorsShort, authorsNames, imprintText } from './links';
import type { Book, PersonInfo, WdPerson, Work } from '../types';

const fc = (color: string) => ({ '--fc': color }) as CSSProperties;
export const lifeYears = (w: WdPerson | null): string => (w?.born ? `${w.born.year}–${w.died ? w.died.year : ''}` : '');

// Торифуда — карточка книги: номер сверху, вертикальное японское название, жанр внизу
export function Fuda({ book: b }: { book: Book }) {
  const m = useCatalog();
  if (b.cover) {
    return (
      <div className="fuda has-cover" style={fc(genreColor(b.genre))}>
        <img className="cover-img" src={b.cover} alt={`Обложка: ${b.title_ru}`} loading="lazy" referrerPolicy="no-referrer" />
      </div>
    );
  }
  return (
    <div className="fuda" style={fc(genreColor(b.genre))} aria-hidden="true">
      <span className="fuda-no" lang="ja">{kanjiNum(m.bookNo.get(b.id) ?? 0)}</span>
      {b.title_orig
        ? <span className="fuda-v" lang="ja">{b.title_orig}</span>
        : <span className={`fuda-v ru${b.title_ru.length > 100 ? ' long' : ''}`}>{b.title_ru}</span>}
      <span className="fuda-foot">{b.genre || ''}</span>
    </div>
  );
}

// Карточка произведения: год создания сверху, вертикальное оригинальное название, вид внизу
export function WorkFuda({ work: w }: { work: Work }) {
  const orig = (w.title_orig || '').split(' / ')[0];
  return (
    <div className="fuda" style={fc(kindColor(w.kind))} aria-hidden="true">
      {/* полоса сверху есть всегда, как у карточек книг; без года (или до н. э.) — пустая */}
      <span className="fuda-no" lang="ja">{w.year != null && w.year > 0 ? kanjiNum(w.year) : ' '}</span>
      {orig && !w.foreign
        ? <span className="fuda-v" lang="ja">{orig}</span>
        : <span className={`fuda-v ru${w.title_ru.length > 100 ? ' long' : ''}`}>{w.title_ru}</span>}
      <span className="fuda-foot">{w.kind || ''}</span>
    </div>
  );
}

// Ёмифуда — карточка человека: портрет и вертикальное имя
export function Yomifuda({ person: p }: { person: PersonInfo }) {
  const m = useCatalog();
  const orig = p.orig || p.name_ru;
  const img = p.image || p.w?.image;  // своя (локальная) копия важнее ссылки на Викисклад
  return (
    <div className="fuda yomi" style={fc(m.personColor(p))} aria-hidden="true">
      {img
        ? <img className="portrait" src={img} alt="" loading="lazy" referrerPolicy="no-referrer" />
        : <div className="portrait none">{orig[0]}</div>}
      {p.kanji ? <span className="fuda-v" lang="ja">{p.kanji}</span> : <span className="fuda-v ru">{orig}</span>}
    </div>
  );
}

// Колода книг с подписями
export function BookDeck({ books, className = '' }: { books: Book[]; className?: string }) {
  const m = useCatalog();
  return (
    <div className={`deck ${className}`}>
      {books.map((b) => (
        <div key={b.id}>
          <a className="fuda-link" href={`#/book/${b.id}`}>
            <Fuda book={b} />
            <div className="caption">{authorsNames(m, b)}<span className="t">{b.title_ru}</span></div>
          </a>
          <div className="caption" style={{ marginTop: 0 }}>
            {imprintText(b)}
            {m.seriesOf(b) && <><br />серия <SeriesText book={b} /></>}
            {b.translators.length > 0 && <><br />пер. <TranslatorsShort book={b} /></>}
          </div>
        </div>
      ))}
    </div>
  );
}

// Колода произведений («Произведения»): карточка, автор и название; под ними — оригинал, год создания, вид
export function WorkDeck({ works }: { works: Work[] }) {
  const m = useCatalog();
  return (
    <div className="deck">
      {works.map((w) => {
        const orig = (w.title_orig || '').split(' / ')[0];
        const meta = [w.year != null ? workYearText(w.year) : '', w.kind || '', w.foreign ? w.lang || '' : ''].filter(Boolean).join(', ');
        return (
          <div key={w.id}>
            <a className="fuda-link" href={`#/work/${w.id}`}>
              <WorkFuda work={w} />
              <div className="caption">{w.authors.map((a) => m.authorInfo(a).name_ru).join(', ')}<span className="t">{w.title_ru}</span></div>
            </a>
            <div className="caption" style={{ marginTop: 0 }}>
              {orig && <span lang={w.foreign ? undefined : 'ja'}>{orig}</span>}
              {orig && meta && <br />}
              {meta}
            </div>
          </div>
        );
      })}
    </div>
  );
}
const workYearText = (y: number) => (y < 0 ? `${-y} до н. э.` : String(y));

// Колода людей; marker(p) может вернуть отметку (например, букву), которая встаёт в ряд перед карточкой
export function PeopleDeck({ people, hrefBase, extra }: {
  people: PersonInfo[];
  hrefBase: string;
  extra?: (p: PersonInfo) => ReactNode;
}) {
  return (
    <div className="deck small">
      {people.map((p, i) => (
        <PeopleDeckItem key={`${p.id}-${i}`} person={p} hrefBase={hrefBase} extra={extra} />
      ))}
    </div>
  );
}

function PeopleDeckItem({ person: p, hrefBase, extra }: {
  person: PersonInfo; hrefBase: string; extra?: (p: PersonInfo) => ReactNode;
}) {
  return (
    <a className="fuda-link" href={`#/${hrefBase}/${p.id}`}>
      <Yomifuda person={p} />
      <div className="caption"><span className="t">{p.name_ru}</span>{lifeYears(p.w)}{extra && <><br />{extra(p)}</>}</div>
    </a>
  );
}
