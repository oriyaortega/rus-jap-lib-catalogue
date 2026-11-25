// Страница произведения: издания каталога, в которых оно вышло, и публикации на русском по данным Фантлаба
import { norm } from './text';
import type { Book, ContentItem, Translator, Work, WorkEditions, WorkPublication } from '../types';

// Оригинальное название без латинской транскрипции, которую Фантлаб иногда пишет через « / »
export const origKey = (s: string | null | undefined): string => (s || '').split(' / ')[0].replace(/\s+/g, '').trim();
const ruKey = (s: string | null | undefined): string => norm((s || '').replace(/^[«"„]+|[»"“]+$/g, ''));

// Название книги может состоять из нескольких произведений: «Слушай песню ветра. Пинбол 1973»,
// «竹取物語・落窪物語»; произведение подходит, если совпадает одна из частей
const ruParts = (s: string | null | undefined): string[] => (s || '').split(/[.;]\s+|\s*—\s*|\.—/).map(ruKey).filter(Boolean);
const origParts = (s: string | null | undefined): string[] => origKey(s).split(/[・、,]/).filter(Boolean);

// Автор произведения в содержании сборника: указанный в нём, а если не указан — единственный автор книги
export const itemAuthor = (b: Book, c: ContentItem): string | null => c.a || (b.authors.length === 1 ? b.authors[0] : null);

// Произведения для пунктов содержания сборников. Пункт относится к произведению из works с тем же автором
// и тем же оригинальным или русским названием. Для остальных пунктов создаются произведения по самому
// содержанию (derived): одно на автора и название, id — «c-<книга>-<номер пункта>» по первому упоминанию.
// Пункты без названия остаются без произведения.
export function contentWorks(books: Book[], works: Work[]): { byItem: Map<ContentItem, Work>; derived: Work[] } {
  const known = new Map<string, Work>();
  const key = (a: string | null, k: string) => `${a || ''}|${k}`;
  for (const w of works) {
    for (const a of w.authors.length ? w.authors : [null]) {
      if (origKey(w.title_orig)) known.set(key(a, `o:${origKey(w.title_orig)}`), known.get(key(a, `o:${origKey(w.title_orig)}`)) || w);
      if (ruKey(w.title_ru)) known.set(key(a, `t:${ruKey(w.title_ru)}`), known.get(key(a, `t:${ruKey(w.title_ru)}`)) || w);
    }
  }
  const byItem = new Map<ContentItem, Work>();
  const derived: Work[] = [];
  books.forEach((b) => (b.contents || []).forEach((c, i) => {
    if (!c.t) return;
    const a = itemAuthor(b, c);
    const ko = origKey(c.o) && key(a, `o:${origKey(c.o)}`), kt = key(a, `t:${ruKey(c.t)}`);
    let w = (ko && known.get(ko)) || known.get(kt);
    if (!w) {
      w = { id: `c-${b.id}-${i + 1}`, authors: a ? [a] : [], title_ru: c.t.replace(/^«|»$/g, ''), title_orig: c.o || null, kind: c.k, derived: true };
      derived.push(w);
      if (ko) known.set(ko, w);
      known.set(kt, w);
    }
    byItem.set(c, w);
  }));
  return { byItem, derived };
}

// Издания каталога с этим произведением:
//  - перечисленные в самом произведении (поле books, для неяпонских авторов);
//  - книги того же автора, в названии или оригинальном названии которых есть это произведение;
//  - сборники, в содержании которых оно есть (тот же автор и оригинал или русское название);
//  - издания Фантлаба, сопоставленные с книгами каталога (поле book).
// У произведений без автора (анонимные повести) книги ищутся по всему каталогу.
export function catalogBooksOfWork(w: Work, booksOfAuthor: (id: string) => Book[], bookById: (id: string) => Book | undefined,
  pubs: WorkPublication[] = [], allBooks: Book[] = []): Book[] {
  const o = origKey(w.title_orig), ru = ruKey(w.title_ru);
  const found = new Map<string, Book>();
  const add = (b: Book | undefined) => { if (b && !found.has(b.id)) found.set(b.id, b); };
  const sameTitle = (b: Book) => (o && origParts(b.title_orig).includes(o)) || (ru && ruParts(b.title_ru).includes(ru));
  const inContents = (b: Book, a: string | null) => (b.contents || []).some((c) => (a === null || itemAuthor(b, c) === a) && ((o && origKey(c.o) === o) || (ru && ruKey(c.t) === ru)));
  (w.books || []).forEach((id) => add(bookById(id)));
  pubs.forEach((p) => p.book && add(bookById(p.book)));
  for (const a of w.authors) {
    for (const b of booksOfAuthor(a)) if ((b.authors.includes(a) && sameTitle(b)) || inContents(b, a)) add(b);
  }
  if (!w.authors.length) for (const b of allBooks) if (sameTitle(b) || inContents(b, null)) add(b);
  return [...found.values()].sort((x, y) => (x.year ?? 9999) - (y.year ?? 9999) || x.title_ru.localeCompare(y.title_ru, 'ru'));
}

// Переводчик с Фантлаба («Вадим Смоленский») → переводчик каталога («Смоленский Вадим»): те же слова в любом порядке
const nameKey = (s: string) => norm(s).split(' ').filter(Boolean).sort().join(' ');
export function translatorIndex(list: Translator[]): (name: string) => Translator | undefined {
  const map = new Map<string, Translator>();
  for (const t of list) map.set(nameKey(t.name_ru), t);
  return (name) => map.get(nameKey(name));
}

// Строка публикации: «Название»; издательство, год, вид
export function publicationText(p: WorkPublication): string {
  return [p.publisher, p.year, p.pages ? `${p.pages} с.` : ''].filter(Boolean).join(', ');
}

// Публикации по годам, без года — в конце
export function sortPublications(list: WorkPublication[]): WorkPublication[] {
  return [...list].sort((x, y) => (x.year ?? 9999) - (y.year ?? 9999) || x.title.localeCompare(y.title, 'ru'));
}

// Данные Фантлаба для произведения; null — данных нет
export const editionsOf = (all: WorkEditions | null, w: Work) => (all && all[w.id]) || null;

// Переводчики произведения по каталогу: поле translators произведения, переводчики в содержании сборников,
// а для отдельных изданий (книга — это само произведение) — переводчики книги
export function workTranslatorIds(w: Work, books: Book[]): string[] {
  const o = origKey(w.title_orig), ru = ruKey(w.title_ru);
  const ids = new Set<string>(w.translators || []);
  for (const b of books) {
    const own = (b.contents || []).filter((c) => (w.authors.length ? w.authors.includes(itemAuthor(b, c) || '') : !itemAuthor(b, c)) && ((o && origKey(c.o) === o) || (ru && ruKey(c.t) === ru)));
    if (own.length) own.forEach((c) => c.tr.forEach((t) => ids.add(t)));
    else if (!(b.contents || []).length || b.contents!.length === 1) b.translators.forEach((t) => ids.add(t));
  }
  return [...ids];
}
