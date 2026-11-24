// Постепенная отрисовка длинных списков: сколько элементов показать сейчас и как резать группы

// Размер первой порции и шага подгрузки (в элементах)
export const PORTION = {
  bookCards: 48,     // карточки книг
  peopleCards: 96,   // карточки людей
  rows: 150,         // строки таблиц и текстовых списков
} as const;

// Первые limit элементов из групп [заголовок, элементы][]: целые группы, последняя — обрезанная; пустые не возвращаются
export function takeGroups<G, T>(groups: [G, T[]][], limit: number): [G, T[]][] {
  const out: [G, T[]][] = [];
  let left = Math.max(0, limit);
  for (const [g, items] of groups) {
    if (left <= 0) break;
    out.push([g, items.length <= left ? items : items.slice(0, left)]);
    left -= items.length;
  }
  return out;
}

// Порядковый номер первого элемента каждой группы в общем списке — для перехода к группе
export function groupStarts<G, T>(groups: [G, T[]][]): number[] {
  const starts: number[] = [];
  let n = 0;
  for (const [, items] of groups) { starts.push(n); n += items.length; }
  return starts;
}

export const totalOf = <G, T>(groups: [G, T[]][]): number => groups.reduce((n, [, items]) => n + items.length, 0);

// Новый предел после подгрузки или перехода: не меньше нужного, не больше всего списка
export function nextLimit(current: number, total: number, step: number, needIndex?: number): number {
  const want = needIndex === undefined ? current + step : Math.max(current, needIndex + step);
  return Math.min(total, Math.max(current, want));
}
