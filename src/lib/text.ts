// Строковые помощники: склонение, японские цифры, нормализация для поиска, алфавитный порядок

export const collator = new Intl.Collator('ru', { sensitivity: 'base' });

// Алфавитный порядок с Ё отдельной буквой после Е (Intl.Collator считает их одной)
export const ALPHABET = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
export const letterRank = (s: string | null | undefined): number => {
  const i = ALPHABET.indexOf((s || '')[0]?.toUpperCase() ?? '');
  return i < 0 ? 99 : i;
};
export const alphaCompare = (a: string, b: string): number => letterRank(a) - letterRank(b) || collator.compare(a, b);

// Ключ сортировки названия: без кавычек, скобок и прочих знаков в начале
export const titleKey = (s: string | null | undefined): string => (s || '').replace(/^[^0-9A-Za-zА-Яа-яЁё]+/, '');

export const CJK = /[぀-ヿ㐀-鿿豈-﫿]/;
export const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

// Дата «2026-11-23» словами: «23 ноября 2026»
export function dayText(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : iso;
}

export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} ${one}`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}

// Японская запись числа: 1 → 一, 12 → 十二, 47 → 四十七, 100 → 百, 2041 → 二千四十一
export function kanjiNum(n: number): string {
  const d = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const part = (x: number, unit: string) => (x === 0 ? '' : (x === 1 ? '' : d[x]) + unit);
  const th = Math.floor(n / 1000), h = Math.floor((n % 1000) / 100), t = Math.floor((n % 100) / 10), u = n % 10;
  return part(th, '千') + part(h, '百') + part(t, '十') + d[u] || '〇';
}

// Нормализация для поиска: регистр, ё/е, диакритика, разные транслитерации японских имён
export function norm(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ё/g, 'е').replace(/э/g, 'е')
    .replace(/щ/g, 'с').replace(/ш/g, 'с')
    .replace(/дж/g, 'дз').replace(/ч(?=[иеяю])/g, 'т')
    .replace(/ou|oo/g, 'o').replace(/uu/g, 'u')
    .replace(/[«»"“”„'’\-–—.,:;!?()]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
