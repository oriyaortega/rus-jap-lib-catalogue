// Подписи источников на странице книги

// URL → название сайта
const SOURCE_RULES: [RegExp, string][] = [
  [/fantlab/, 'Фантлаб'],
  [/polyandria/, 'сайт «Поляндрии»'],
  [/labirint/, 'Лабиринт'],
  [/hse\.ru/, 'сайт ВШЭ'],
  [/dvfu\.ru/, 'библиотека ДВФУ'],
  [/orientalstudies/, 'сайт ИВР РАН'],
  [/book\.ivran\.ru/, 'каталог ИВ РАН'],
  [/wikipedia/, 'Википедия'],
  [/azbooka/, 'сайт «Азбуки»'],
  [/bombora/, 'сайт «Бомборы»'],
  [/livelib/, 'LiveLib'],
  [/mann-ivanov-ferber/, 'сайт МИФ'],
  [/alpinabook/, 'сайт «Альпины»'],
  [/podpisnie/, '«Подписные издания»'],
];
export const sourceName = (url: string): string => SOURCE_RULES.find(([re]) => re.test(url))?.[1] ?? 'ссылка';

// Короткие ключи в поле sources
export const SOURCE_NAMES: Record<string, string> = {
  xlsx: 'картотека составителя', gsheet: 'таблица составителя', fantlab: 'Фантлаб', polyandria: 'сайт «Поляндрии»', labirint: 'Лабиринт',
  hse: 'сайт ВШЭ', wikipedia: 'Википедия', azbuka: 'сайт «Азбуки»', bombora: 'сайт «Бомборы»', livelib: 'LiveLib', mif: 'сайт МИФ',
  alpina: 'сайт «Альпины»', ivran: 'каталог ИВ РАН',
};
