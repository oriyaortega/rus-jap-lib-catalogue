import { describe, expect, it } from 'vitest';
import { groupStarts, nextLimit, takeGroups, totalOf } from './progressive';

const groups: [string, number[]][] = [['А', [1, 2, 3]], ['Б', [4]], ['В', [5, 6, 7, 8]]];

describe('takeGroups', () => {
  it('целые группы, последняя обрезана', () => {
    expect(takeGroups(groups, 5)).toEqual([['А', [1, 2, 3]], ['Б', [4]], ['В', [5]]]);
  });
  it('ровно на границе группы — следующая не начинается', () => {
    expect(takeGroups(groups, 4)).toEqual([['А', [1, 2, 3]], ['Б', [4]]]);
  });
  it('предел больше списка — всё; ноль и меньше — ничего', () => {
    expect(takeGroups(groups, 100)).toEqual(groups);
    expect(takeGroups(groups, 0)).toEqual([]);
    expect(takeGroups(groups, -3)).toEqual([]);
  });
  it('исходные группы не меняются', () => {
    takeGroups(groups, 2);
    expect(groups[0][1]).toEqual([1, 2, 3]);
  });
});

describe('groupStarts и totalOf', () => {
  it('номер первого элемента каждой группы', () => expect(groupStarts(groups)).toEqual([0, 3, 4]));
  it('всего элементов', () => {
    expect(totalOf(groups)).toBe(8);
    expect(totalOf([])).toBe(0);
  });
});

describe('nextLimit', () => {
  it('подгрузка — на шаг, но не больше всего списка', () => {
    expect(nextLimit(48, 4001, 48)).toBe(96);
    expect(nextLimit(3990, 4001, 48)).toBe(4001);
  });
  it('переход к элементу — до него и ещё шаг после', () => {
    expect(nextLimit(48, 4001, 48, 1000)).toBe(1048);
    expect(nextLimit(48, 1010, 48, 1000)).toBe(1010);
  });
  it('переход к уже показанному элементу не уменьшает предел', () => {
    expect(nextLimit(500, 4001, 48, 10)).toBe(500);
  });
});
