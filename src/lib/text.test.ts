import { describe, expect, it } from 'vitest';
import { alphaCompare, kanjiNum, letterRank, norm, plural, titleKey } from './text';

describe('plural', () => {
  const forms: [string, string, string] = ['книга', 'книги', 'книг'];
  it.each([
    [1, '1 книга'], [2, '2 книги'], [4, '4 книги'], [5, '5 книг'], [11, '11 книг'], [12, '12 книг'], [14, '14 книг'],
    [21, '21 книга'], [22, '22 книги'], [25, '25 книг'], [101, '101 книга'], [111, '111 книг'], [0, '0 книг'],
  ])('%i → %s', (n, s) => expect(plural(n, forms)).toBe(s));
});

describe('kanjiNum', () => {
  it.each([
    [1, '一'], [9, '九'], [10, '十'], [12, '十二'], [20, '二十'], [47, '四十七'], [100, '百'], [101, '百一'],
    [282, '二百八十二'], [999, '九百九十九'], [1000, '千'], [2041, '二千四十一'], [4001, '四千一'], [3999, '三千九百九十九'],
  ])('%i → %s', (n, s) => expect(kanjiNum(n)).toBe(s));
  it('ноль — 〇', () => expect(kanjiNum(0)).toBe('〇'));
});

describe('norm', () => {
  it('регистр, ё/э → е, ш/щ → с', () => expect(norm('Мишима Щёголь Эдо')).toBe(norm('мисима сеголь едо')));
  it('дж → дз, ч перед гласной → т', () => {
    expect(norm('Джунъитиро')).toBe(norm('дзунъитиро'));
    expect(norm('Танидзаки Дзюнъичиро')).toContain('дзюнъитиро');
  });
  it('латиница: диакритика и долгие гласные', () => {
    expect(norm('Ōe Kenzaburō')).toBe('oe kenzaburo');
    expect(norm('Tōkyō')).toBe(norm('Tokyo'));
    expect(norm('Kyuushuu')).toBe('kyushu');
    expect(norm('Tookyou')).toBe('tokyo');
  });
  it('знаки препинания и кавычки — пробелы, лишние пробелы схлопываются', () => {
    expect(norm('«Снежная страна» — роман!')).toBe('снежная страна роман');
  });
  it('null и числа', () => {
    expect(norm(null)).toBe('');
    expect(norm(1993)).toBe('1993');
  });
});

describe('алфавитный порядок', () => {
  it('Ё — отдельная буква после Е', () => {
    expect(letterRank('Ёж')).toBe(letterRank('Е') + 1);
    const names = ['Ёрохин', 'Жуков', 'Ершов', 'Ежов'];
    expect([...names].sort(alphaCompare)).toEqual(['Ежов', 'Ершов', 'Ёрохин', 'Жуков']);
  });
  it('латиница и цифры — после кириллицы', () => {
    expect(['Matt', 'Яковлев', 'Абэ'].sort(alphaCompare)).toEqual(['Абэ', 'Яковлев', 'Matt']);
  });
  it('titleKey убирает кавычки и знаки в начале', () => {
    expect(titleKey('«Исповедь маски»')).toBe('Исповедь маски»');
    expect(titleKey('(Без названия)')).toBe('Без названия)');
    expect(titleKey('1984')).toBe('1984');
    expect(titleKey(null)).toBe('');
  });
});
