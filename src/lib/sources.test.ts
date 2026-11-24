import { describe, expect, it } from 'vitest';
import { SOURCE_NAMES, sourceName } from './sources';

describe('sourceName', () => {
  it.each([
    ['https://fantlab.ru/edition228293', 'Фантлаб'],
    ['https://www.labirint.ru/books/679330/', 'Лабиринт'],
    ['https://www.hse.ru/org/persons/209813127/', 'сайт ВШЭ'],
    ['https://www.orientalstudies.ru/rus/index.php?pub=3103', 'сайт ИВР РАН'],
    ['https://book.ivran.ru/book?id=4', 'каталог ИВ РАН'],
    ['https://ru.wikipedia.org/wiki/Штейнер', 'Википедия'],
    ['https://azbooka.ru/books/x', 'сайт «Азбуки»'],
    ['https://bombora.ru/book/1/', 'сайт «Бомборы»'],
    ['https://www.livelib.ru/book/1', 'LiveLib'],
    ['https://www.mann-ivanov-ferber.ru/catalog/x', 'сайт МИФ'],
    ['https://alpinabook.ru/catalog/x', 'сайт «Альпины»'],
    ['https://www.podpisnie.ru/books/x', '«Подписные издания»'],
    ['https://polyandria.ru/noage/', 'сайт «Поляндрии»'],
    ['https://lib.dvfu.ru/x', 'библиотека ДВФУ'],
    ['https://example.org/', 'ссылка'],
  ])('%s → %s', (url, name) => expect(sourceName(url)).toBe(name));

  it('ключи sources переводятся в названия', () => {
    expect(SOURCE_NAMES.xlsx).toBe('картотека составителя');
    expect(SOURCE_NAMES.ivran).toBe('каталог ИВ РАН');
  });
});
