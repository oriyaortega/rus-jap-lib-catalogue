// Страница автора: профиль, издания (по произведениям), список произведений
import { useCatalog } from '../context';
import { Fuda } from '../components/cards';
import { SectionTitle } from '../components/common';
import { SeriesText, TranslatorsShort, imprintText } from '../components/links';
import { Profile } from '../components/Profile';
import { WorksList } from '../components/WorksList';
import { authorWorks } from '../lib/grouping';
import { useProgressive } from '../hooks/useProgressive';
import { PORTION } from '../lib/progressive';
import { NotFound } from './NotFound';
import type { Book } from '../types';

export function AuthorPage({ id }: { id: string }) {
  const m = useCatalog();
  // hide_on_author: издание показано в разделе «Другое издание» другой карточки, в списке автора не повторяем
  const works = authorWorks(m.booksOf(id));
  // произведения рисуются постепенно; список «Произведения на русском языке» — после них
  const lazy = useProgressive(works.length, PORTION.bookCards, id);
  if (!m.authorsById.has(id)) return <NotFound />;
  const count = works.reduce((n, eds) => n + eds.length, 0);
  const list = m.worksOf(id);
  return (
    <>
      <Profile person={m.authorInfo(id)} role="автор" />
      <SectionTitle>{`Издания на русском · ${count}`}</SectionTitle>
      {works.slice(0, lazy.limit).map((eds) => <WorkRow key={eds[0].id} editions={eds} />)}
      {lazy.sentinel}
      {lazy.limit >= works.length && <WorksList works={list} title={`Произведения на русском языке · ${list.length}`} />}
    </>
  );
}

// Произведение: карточка первого издания, описание и список всех изданий
function WorkRow({ editions }: { editions: Book[] }) {
  const m = useCatalog();
  const b = editions[0];
  return (
    <div className="work-row">
      <a href={`#/book/${b.id}`}><Fuda book={b} /></a>
      <div>
        <div className="meta">{`${b.genre}${b.orig_year ? ` · ${b.orig_year}` : ''}`}</div>
        <h3>{b.title_ru}</h3>
        {b.title_orig && <div><span lang="ja">{b.title_orig}</span>{b.title_romaji && <>{' '}<span className="romaji">{b.title_romaji}</span></>}</div>}
        {b.work_note && <p>{b.work_note}</p>}
        <ul className="ed-list">
          {editions.map((e) => (
            <li key={e.id}>
              <a href={`#/book/${e.id}`}>{e.title_ru}</a>{` — ${imprintText(e)}`}
              {m.seriesOf(e) && <>; серия <SeriesText book={e} /></>}
              {e.isbn && `; ISBN ${e.isbn}`}
              {e.translators.length > 0 && <>; пер. <TranslatorsShort book={e} /></>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
