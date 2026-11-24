// Структура data/catalog.json (описание полей: docs/technical/data-model.md)

export interface Link { name: string; url: string }

export interface ContentItem {
  a?: string | null;   // id автора
  at?: string;         // подпись автора текстом
  t?: string;          // название (в нескольких записях не указано)
  o?: string;          // оригинал
  k?: string;          // вид
  tr: string[];        // переводчики
  p?: string;          // страницы
}

export interface Edition {
  title?: string; city?: string; publisher?: string; year?: number | string; pages?: number | string;
  isbn?: string; size?: string; binding?: string; note?: string; book?: string;
  cover?: string; cover_src?: string; source?: string;
}

export interface Book {
  id: string;
  title_ru: string;
  title_orig: string | null;
  title_romaji: string | null;
  authors: string[];
  translators: string[];
  year: number | null;
  city: string | null;
  publisher: string | null;
  pages: number | null;
  isbn?: string;
  print_run?: number;
  series?: { id: string; no?: number | null };
  genre: string;
  orig_year: string | null;
  tags: string[];
  work_note?: string | null;
  contents?: ContentItem[];
  editions?: Edition[];
  hide_on_author?: boolean;
  cover?: string;
  cover_src?: string;
  source?: string;
  sources?: string[];
  links?: Link[];
  added?: string;
}

export interface Alias { name_ru: string; sort?: string }

export interface Author {
  id: string;
  name_ru: string;
  sort: string;
  name_orig?: string | null;
  full_name?: string;
  wikidata?: string | null;
  bio?: string;
  bio_src?: Link;
  image?: string;
  image_src?: string;
  links?: Link[];
  pseudonym?: string;
  real_name?: string;
  aliases?: Alias[];
  era?: string;
  hide_latin?: boolean;
}

export interface Translator {
  id: string;
  name_ru: string;
  short?: string;
  sort: string;
  wikidata?: string | null;
  bio?: string;
  bio_src?: Link;
  image?: string;
  image_src?: string;
  links?: Link[];
}

export interface Series {
  id: string; name: string; publisher?: string; city?: string; years?: string; note?: string; source?: string;
}

export interface Work {
  id: string;
  authors: string[];
  title_ru: string;
  title_orig?: string | null;
  title_romaji?: string | null;
  kind?: string;
  year?: number | null;
  fantlab?: number;
  foreign?: boolean;
  lang?: string;
  books?: string[];
}

export interface NewsItem { date: string; text: string }

export interface Catalog {
  authors: Author[];
  translators: Translator[];
  books: Book[];
  news: NewsItem[];
  series: Series[];
  works?: Work[];
}

// Сведения о человеке из Викиданных
export interface WdDate { year: number; text: string }
export interface WdPerson {
  ru: string | null; ja: string | null; en: string | null;
  kana: string | null;
  born: WdDate | null;
  died: WdDate | null;
  birthplaceId: string | null;
  birthplace: string | null;
  image: string | null;
  ruwiki: string | null;
  jawiki: string | null;
  aliases: string[];
}
export type WdMap = Record<string, WdPerson>;
export type WdState = 'loading' | 'ok' | 'partial' | 'error';

// Человек, подготовленный к показу: запись каталога + Викиданные
export interface PersonInfo {
  id: string;
  kind: 'author' | 'translator';
  name_ru: string;
  sort: string;
  short?: string;
  full_name?: string;
  wikidata?: string | null;
  bio?: string;
  bio_src?: Link;
  image?: string;
  links?: Link[];
  pseudonym?: string;
  real_name?: string;
  hide_latin?: boolean;
  w: WdPerson | null;
  kanji: string | null;
  orig: string;
  aliasOf?: PersonInfo;   // строка-псевдоним в перечне авторов
}
