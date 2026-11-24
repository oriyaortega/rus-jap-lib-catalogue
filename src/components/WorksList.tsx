// Произведения: ссылка на название и список на странице автора (по данным Фантлаба)
import { SectionTitle } from './common';
import { collator } from '../lib/text';
import type { Work } from '../types';

// Японские произведения — ссылка на Фантлаб, остальные — на издание в каталоге
export function WorkTitleLink({ work: w }: { work: Work }) {
  if (w.fantlab) return <a href={`https://fantlab.ru/work${w.fantlab}`} target="_blank" rel="noopener">{w.title_ru}</a>;
  if (w.books?.length) return <a href={`#/book/${w.books[0]}`}>{w.title_ru}</a>;
  return <>{w.title_ru}</>;
}

export function WorksList({ works, title }: { works: Work[]; title: string }) {
  if (!works.length) return null;
  const sorted = [...works].sort((x, y) => collator.compare(x.title_ru, y.title_ru));
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      <ul className="works-list">
        {sorted.map((w) => (
          <li key={w.id}>
            <span className="w"><WorkTitleLink work={w} /></span>
            {w.title_orig && <>{' '}<span lang={w.foreign ? undefined : 'ja'}>{w.title_orig}</span></>}
            {w.title_romaji && <>{' '}<span className="romaji">{w.title_romaji}</span></>}
            {w.kind && <>{' '}<span className="k">{w.kind}</span></>}
          </li>
        ))}
      </ul>
    </>
  );
}
