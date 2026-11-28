// Легенда цветов — видна только в цветном варианте (CSS)
import type { CSSProperties } from 'react';
import { useCatalog } from '../context';
import type { Book } from '../types';
import { ERA_COLORS, GENRE_COLORS, OTHER_COLOR, TRANSLATOR_COLOR, kindGenre } from '../lib/colors';

const swatch = (c: string) => <i style={{ '--fc': c } as CSSProperties} />;

// genre — жанры книг; work — жанры, которым соответствуют виды произведений («Произведения»); era — эпохи авторов
// books — книги страницы: в легенде только их жанры (по умолчанию — все книги каталога)
export function Legend({ kind, books }: { kind: 'genre' | 'work' | 'era'; books?: Book[] }) {
  const m = useCatalog();
  if (kind === 'genre' || kind === 'work') {
    const used = new Set(kind === 'work' ? (m.catalog.works || []).map((w) => kindGenre(w.kind)) : (books || m.catalog.books).map((b) => b.genre));
    return (
      <div className="legend" aria-label="Цвет каймы — жанр">
        <span className="legend-t">Кайма — жанр:</span>
        {Object.entries(GENRE_COLORS).filter(([g]) => used.has(g)).map(([g, [c, kanji]]) => (
          <span key={g}>{swatch(c)}{`${g} `}<span lang="ja">{kanji}</span></span>
        ))}
      </div>
    );
  }
  return (
    <div className="legend" aria-label="Цвет каймы — эпоха">
      <span className="legend-t">Кайма — эпоха:</span>
      {Object.entries(ERA_COLORS).map(([e, [c, kanji]]) => <span key={e}>{swatch(c)}{`${e} `}<span lang="ja">{kanji}</span></span>)}
      <span>{swatch(OTHER_COLOR)}о Японии</span>
      <span>{swatch(TRANSLATOR_COLOR)}переводчики</span>
    </div>
  );
}
