import { describe, expect, it } from 'vitest';
import { ERA_COLORS, GENRE_COLORS, eraByBirthYear, genreColor } from './colors';

describe('genreColor', () => {
  it('цвет жанра из таблицы', () => expect(genreColor('роман')).toBe(GENRE_COLORS['роман'][0]));
  it('неизвестный или пустой жанр — серый', () => {
    expect(genreColor('комикс')).toBe('#5b5b5b');
    expect(genreColor(null)).toBe('#5b5b5b');
  });
});

describe('eraByBirthYear', () => {
  it.each([
    [966, 'Хэйан'], [1149, 'Хэйан'], [1150, 'Камакура'], [1299, 'Камакура'], [1300, 'Муромати'], [1644, 'Эдо'],
    [1849, 'Эдо'], [1850, 'Мэйдзи'], [1867, 'Мэйдзи'], [1892, 'Тайсё'], [1925, 'Сёва'], [1944, 'Сёва'], [1949, 'современность'],
  ])('%i → %s', (y, era) => expect(eraByBirthYear(y)).toBe(era));
  it('каждая эпоха есть в таблице цветов', () => {
    for (const y of [1000, 1200, 1400, 1700, 1870, 1900, 1930, 1990]) expect(ERA_COLORS[eraByBirthYear(y)]).toBeDefined();
  });
});
