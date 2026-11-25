// Каталог с индексами и производными сведениями. Создаётся заново, когда приходят данные Викиданных.
import { CJK, alphaCompare, collator, norm } from './text';
import { ERA_COLORS, OTHER_COLOR, TRANSLATOR_COLOR, eraByBirthYear } from './colors';
import { contentWorks } from './workPage';
import type { EditionKeys } from './grouping';
import type { Author, Book, Catalog, ContentItem, PersonInfo, Series, Translator, WdMap, WdState, Work } from '../types';

export type BookSort = 'author' | 'title' | 'year' | 'publisher';
type Cmp<T> = (x: T, y: T) => number;

export class CatalogModel {
  readonly authorsById: Map<string, Author>;
  readonly translatorsById: Map<string, Translator>;
  readonly bookNo: Map<string, number>;   // номер карточки, как в «Хякунин иссю»: позиция книги в каталоге
  private readonly seriesById: Map<string, Series>;
  private readonly booksByAuthor = new Map<string, Book[]>();
  private readonly booksByTranslator = new Map<string, Book[]>();
  private readonly worksByAuthor = new Map<string, Work[]>();
  private readonly worksById = new Map<string, Work>();
  private itemWorks: Map<ContentItem, Work> | null = null;
  private readonly booksById: Map<string, Book>;
  private readonly eraCache = new Map<string, string | null>();
  private index: Map<Book, { hay: string; raw: string }> | null = null;
  readonly bookSorts: Record<BookSort, Cmp<Book>>;

  constructor(readonly catalog: Catalog, readonly wd: WdMap, readonly wdState: WdState) {
    this.authorsById = new Map(catalog.authors.map((a) => [a.id, a]));
    this.translatorsById = new Map(catalog.translators.map((t) => [t.id, t]));
    this.bookNo = new Map(catalog.books.map((b, i) => [b.id, i + 1]));
    this.booksById = new Map(catalog.books.map((b) => [b.id, b]));
    this.seriesById = new Map(catalog.series.map((s) => [s.id, s]));
    const push = <T>(m: Map<string, T[]>, k: string, v: T) => { const l = m.get(k); if (l) l.push(v); else m.set(k, [v]); };
    for (const b of catalog.books) {
      // автор книги или автор произведения в сборнике; книга — один раз
      for (const id of new Set([...b.authors, ...(b.contents || []).map((w) => w.a).filter((a): a is string => !!a)])) push(this.booksByAuthor, id, b);
      for (const id of new Set(b.translators)) push(this.booksByTranslator, id, b);
    }
    for (const w of catalog.works || []) {
      this.worksById.set(w.id, w);
      for (const id of new Set(w.authors)) push(this.worksByAuthor, id, w);
    }

    const titleKeyOf = (b: Book) => (b.title_ru || '').replace(/^[«"„'(\[\s]+/, '');
    const byBookTitle: Cmp<Book> = (x, y) => alphaCompare(titleKeyOf(x), titleKeyOf(y)) || (x.year || 0) - (y.year || 0);
    this.bookSorts = {
      author: (x, y) => (Number(!x.authors.length) - Number(!y.authors.length)) || alphaCompare(this.firstAuthorSort(x), this.firstAuthorSort(y)) || (x.year || 0) - (y.year || 0) || byBookTitle(x, y),
      title: byBookTitle,
      year: (x, y) => (x.year ?? 99999) - (y.year ?? 99999) || byBookTitle(x, y),
      publisher: (x, y) => (Number(!x.publisher) - Number(!y.publisher)) || collator.compare(x.publisher || '', y.publisher || '') || (x.year || 0) - (y.year || 0) || byBookTitle(x, y),
    };
  }

  // ---------- люди ----------
  authorInfo(id: string): PersonInfo {
    const a: Author = this.authorsById.get(id) || { id, name_ru: id, sort: id };
    const w = a.wikidata ? this.wd[a.wikidata] ?? null : null;
    // name_orig: строка — своё значение; null — японского имени нет; поля нет — берём из Викиданных
    const orig = 'name_orig' in a ? a.name_orig ?? null : (w?.ja ?? null);
    const kanji = orig && CJK.test(orig) ? orig : null;
    return { ...a, w, kanji, orig: orig || a.name_ru, kind: 'author' };
  }

  translatorInfo(id: string): PersonInfo {
    const t: Translator = this.translatorsById.get(id) || { id, name_ru: id, short: id, sort: id };
    return { ...t, w: t.wikidata ? this.wd[t.wikidata] ?? null : null, kanji: null, orig: t.name_ru, kind: 'translator' };
  }

  // Псевдонимы в перечне авторов: отдельная строка под своей буквой, ссылка ведёт на карточку настоящего автора
  aliasEntries(): PersonInfo[] {
    return this.catalog.authors.flatMap((a) => (a.aliases || []).map((al) => {
      const p = this.authorInfo(a.id);
      return { ...p, name_ru: al.name_ru, sort: al.sort || al.name_ru, orig: al.name_ru, kanji: null, w: null, aliasOf: p };
    }));
  }

  // ---------- книги ----------
  book(id: string): Book | undefined { return this.booksById.get(id); }
  booksOf(id: string): Book[] { return this.booksByAuthor.get(id) || []; }
  translationsOf(id: string): Book[] { return this.booksByTranslator.get(id) || []; }
  worksOf(id: string): Work[] { return this.worksByAuthor.get(id) || []; }
  work(id: string): Work | undefined { this.contentIndex(); return this.worksById.get(id); }
  // произведение для пункта содержания сборника (индекс строится при первом обращении)
  workOfItem(c: ContentItem): Work | undefined { return this.contentIndex().get(c); }
  private contentIndex(): Map<ContentItem, Work> {
    if (!this.itemWorks) {
      const { byItem, derived } = contentWorks(this.catalog.books, this.catalog.works || []);
      for (const w of derived) this.worksById.set(w.id, w);
      this.itemWorks = byItem;
    }
    return this.itemWorks;
  }
  firstAuthorSort(b: Book): string { return this.authorsById.get(b.authors[0])?.sort || ''; }
  seriesOf(b: Book): Series | null { return b.series ? this.seriesById.get(b.series.id) ?? null : null; }
  // ключи сортировки изданий («Издания», «Нехудожественная литература»)
  get editionKeys(): EditionKeys {
    return { bookNo: this.bookNo, authorSort: (b) => this.firstAuthorSort(b), seriesName: (b) => this.seriesOf(b)?.name || '' };
  }
  series(id: string): Series | undefined { return this.seriesById.get(id); }

  // ---------- цвета ----------
  eraOf(authorId: string): string | null {
    if (this.eraCache.has(authorId)) return this.eraCache.get(authorId)!;
    const a = this.authorsById.get(authorId);
    let era: string | null = a?.era ?? null;
    if (!era) {
      // японский автор без явной эпохи — по году рождения из Викиданных
      const born = a?.wikidata && a.name_orig ? this.wd[a.wikidata]?.born?.year : null;
      if (born != null) era = eraByBirthYear(born);
      else {
        const tags = new Set(this.booksOf(authorId).flatMap((b) => b.tags));
        era = Object.keys(ERA_COLORS).find((e) => tags.has(e)) || null;
      }
    }
    this.eraCache.set(authorId, era);
    return era;
  }

  personColor(p: PersonInfo): string {
    if (p.kind === 'translator') return TRANSLATOR_COLOR;
    const era = this.eraOf(p.id);
    return era ? ERA_COLORS[era][0] : OTHER_COLOR;
  }

  // ---------- поиск ----------
  // Текст для поиска по книге: её поля, авторы и переводчики с данными Викиданных
  private buildIndex() {
    const index = new Map<Book, { hay: string; raw: string }>();
    for (const b of this.catalog.books) {
      const parts: unknown[] = [b.title_ru, b.title_orig, b.title_romaji, b.publisher, b.city, b.year, b.genre, b.isbn, this.seriesOf(b)?.name, ...b.tags,
        ...(b.contents || []).flatMap((w) => [w.t, w.o, w.at, w.a && this.authorInfo(w.a).name_ru, w.a && this.authorInfo(w.a).kanji])];
      for (const id of b.authors) {
        const a = this.authorInfo(id);
        parts.push(a.name_ru, a.orig);
        if (a.w) parts.push(a.w.ru, a.w.ja, a.w.en, a.w.kana, ...a.w.aliases);
      }
      for (const id of b.translators) {
        const t = this.translatorInfo(id);
        parts.push(t.name_ru, t.short);
        if (t.w) parts.push(t.w.ru, t.w.en, ...t.w.aliases);
      }
      const raw = parts.filter(Boolean).join(' ');
      index.set(b, { hay: norm(raw), raw });
    }
    return index;
  }

  // Каждое слово запроса должно встретиться в нормализованном или исходном тексте книги
  matches(b: Book, tokens: string[]): boolean {
    if (!tokens.length) return true;
    if (!this.index) this.index = this.buildIndex();
    const { hay, raw } = this.index.get(b)!;
    return tokens.every((tok) => { const n = norm(tok); return (n && hay.includes(n)) || raw.includes(tok); });
  }
}
