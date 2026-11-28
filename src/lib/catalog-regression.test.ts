// Регрессия на настоящем каталоге (data/catalog.json): числа совпадали с тем, что показывала исходная версия сайта;
// 25 ноября 2026 г. добавлены 558 изданий с Фантлаба (fe…), числа обновлены.
// 26 ноября 2026 г.: 15 томов «Берсерка» (fe…) переведены из «новелл» в мангу.
// 27 ноября 2026 г.: ещё две книги Ad Marginem (am17, am18).
// Викиданные не загружаются, поэтому проверяются только запросы, не зависящие от них.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CatalogModel } from './model';
import { authorWorks } from './grouping';
import { newestBooks, recentlyAdded } from './home';
import { tokenize } from './tags';
import { kanjiNum } from './text';
import { catalogBooksOfWork } from './workPage';
import type { Catalog, WorkEditions } from '../types';

const file = path.resolve(__dirname, '../../data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(file, 'utf-8')) as Catalog;
const m = new CatalogModel({ ...catalog, translators: catalog.translators || [], series: catalog.series || [] }, {}, 'error');
const search = (q: string, tags: string[] = []) =>
  catalog.books.filter((b) => tags.every((t) => b.tags.includes(t)) && m.matches(b, tokenize(q)));

describe('каталог', () => {
  it('у всех книг уникальные id, авторы и переводчики существуют', () => {
    expect(new Set(catalog.books.map((b) => b.id)).size).toBe(catalog.books.length);
    for (const b of catalog.books) {
      for (const a of b.authors) expect(m.authorsById.has(a), `${b.id}: автор ${a}`).toBe(true);
      for (const t of b.translators) expect(m.translatorsById.has(t), `${b.id}: переводчик ${t}`).toBe(true);
    }
  });

  it('поиск', () => {
    expect(search('мураками')).toHaveLength(216);
    expect(search('Мишима')).toHaveLength(93);
    expect(search('雪国')).toHaveLength(3);
    // «Murakami» латиницей находится через метки Викиданных — здесь их нет
    expect(search('Murakami')).toHaveLength(0);
    expect(search('', ['манга'])).toHaveLength(190);
    expect(search('', ['манга', 'переводная'])).toHaveLength(188);
    expect(search('', ['переводная'])).toHaveLength(1380);
    expect(search('', ['нехудожественная', 'политика'])).toHaveLength(583);
  });

  it('первые результаты поиска «мураками» по автору', () => {
    expect(search('мураками').sort(m.bookSorts.author).slice(0, 2).map((b) => b.title_ru)).toEqual(['Суси-нуар: занимательное муракамиведение', 'Охота на овец']);
  });

  it('главная: первая из последних добавлений — последняя карточка с самой поздней датой', () => {
    const recent = recentlyAdded(catalog.books, m.bookNo, 5);
    expect(recent).toHaveLength(5);
    expect(m.bookNo.get(recent[0].id)).toBe(Math.max(...catalog.books.filter((b) => b.added === recent[0].added).map((b) => m.bookNo.get(b.id)!)));
    expect(newestBooks(catalog.books, m.bookNo, 12)[0].year).toBe(Math.max(...catalog.books.map((b) => b.year || 0)));
  });

  it('страница Эйдуса: произведения по алфавиту', () => {
    const titles = authorWorks(m.booksOf('ivab000f4c0')).map((w) => w[0].title_ru);
    expect(titles[0]).toBe('Агрессивная политика американского империализма в Японии');
    expect(titles.at(-1)).toBe('Япония. Стенограмма публичной лекции');
  });

  it('номер последней карточки японскими цифрами', () => {
    expect(kanjiNum(catalog.books.length)).toBe('四千五百六十一');
  });
});

describe('страницы произведений', () => {
  const edFile = path.resolve(__dirname, '../../data/work-editions.json');
  const editions = JSON.parse(fs.readFileSync(edFile, 'utf-8')) as WorkEditions;
  const booksOf = (id: string) => catalogBooksOfWork(m.work(id)!, (a) => m.booksOf(a), (b) => m.book(b), editions[id]?.pubs, catalog.books).map((b) => b.id);
  it('издания каталога находятся по названию, содержанию и Фантлабу', () => {
    expect(booksOf('xw2')).toHaveLength(3);
    expect(booksOf('w128586').length).toBeGreaterThanOrEqual(3);
  });
  it('в публикациях — существующие книги каталога и издания Фантлаба', () => {
    for (const [wid, info] of Object.entries(editions)) {
      expect(m.work(wid), wid).toBeTruthy();
      for (const p of info.pubs) {
        expect(p.fl, wid).toBeGreaterThan(0);
        if (p.book) expect(m.book(p.book), `${wid}: ${p.book}`).toBeTruthy();
      }
    }
  });
  it('каждое художественное издание (кроме манги) относится хотя бы к одному произведению; манги и комиксов в «Произведениях» нет', () => {
    const fiction = new Set(['роман', 'новеллы', 'поэзия', 'повесть', 'сказки', 'моногатари', 'драма', 'дзуйхицу']);
    const covered = new Set((catalog.works || []).flatMap((w) => booksOf(w.id)));
    const missing = catalog.books.filter((b) => fiction.has(b.genre) && !covered.has(b.id)).map((b) => b.id);
    expect(missing).toEqual([]);
    expect((catalog.works || []).filter((w) => ['манга', 'комикс', 'графический роман'].includes(w.kind || '')).map((w) => w.id)).toEqual([]);
    for (const w of catalog.works || []) for (const id of w.books || []) expect(m.book(id), `${w.id}: ${id}`).toBeTruthy();
  });
});
