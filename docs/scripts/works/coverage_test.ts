// Временный тест-анализ (переименовать в src/lib/zz-coverage.test.ts и запустить: OUT=<файл> npx vitest run src/lib/zz-coverage.test.ts):
// для каждой книги — список произведений каталога, к которым она относится (той же функцией catalogBooksOfWork, что и сайт).
import fs from 'node:fs';
import path from 'node:path';
import { it } from 'vitest';
import { CatalogModel } from './model';
import { catalogBooksOfWork } from './workPage';
import type { Catalog, WorkEditions } from '../types';

const catalog = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/catalog.json'), 'utf-8')) as Catalog;
const eds = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/work-editions.json'), 'utf-8')) as WorkEditions;
const m = new CatalogModel({ ...catalog, translators: catalog.translators || [], series: catalog.series || [] }, {}, 'error');

it('coverage', () => {
  const covered = new Map<string, string[]>();
  for (const w of catalog.works || []) {
    for (const b of catalogBooksOfWork(w, (a) => m.booksOf(a), (id) => m.book(id), eds[w.id]?.pubs || [], catalog.books)) {
      covered.set(b.id, [...(covered.get(b.id) || []), w.id]);
    }
  }
  const out = catalog.books.map((b) => ({
    id: b.id, genre: b.genre, tags: b.tags, title_ru: b.title_ru, title_orig: b.title_orig, authors: b.authors,
    year: b.year, orig_year: b.orig_year, contents: (b.contents || []).length, works: covered.get(b.id) || [],
  }));
  fs.writeFileSync(process.env.OUT as string, JSON.stringify(out, null, 1));
});
