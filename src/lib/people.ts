// Логика профиля человека: заголовок и строки сведений (без разметки, чтобы можно было тестировать)
import { norm } from './text';
import type { PersonInfo } from '../types';

export type Fact =
  | { key: string; text: string }
  | { key: 'По-японски'; kanji: string; kana: string | null };

// Автор с русским именем: в заголовке полное имя (своё поле full_name или из Викиданных)
export function isRussianName(p: PersonInfo): boolean {
  return p.kind === 'author' && !p.kanji && p.orig === p.name_ru;
}

export function profileHeading(p: PersonInfo): string {
  const w = p.w;
  const wdFull = w?.ru && w.ru.includes(',') && norm(w.ru).startsWith(norm(p.sort)) ? w.ru.replace(',', '') : null;
  return isRussianName(p) ? (p.full_name || wdFull || p.name_ru) : p.name_ru;
}

export function profileFacts(p: PersonInfo): Fact[] {
  const w = p.w;
  const ruName = isRussianName(p);
  const facts: (Fact | false | null | undefined | '')[] = [
    p.kind === 'author' && !ruName && { key: 'Имя на русском', text: p.name_ru },
    !ruName && p.full_name && { key: 'Полное имя', text: p.full_name },
    p.kind === 'translator' && w?.ru && norm(w.ru).includes(norm(p.sort)) && norm(w.ru) !== norm(p.name_ru) && { key: 'Полное имя', text: w.ru.replace(',', '') },
    w?.ru && !norm(w.ru).includes(norm(p.sort)) && !norm(w.ru).includes(norm(p.name_ru.split(' ').pop())) && { key: 'Также известен(а) как', text: w.ru },
    p.kind === 'author' && !p.kanji && p.orig !== p.name_ru && { key: 'Имя в оригинале', text: p.orig },
    // Русские имена (авторы с русским именем и переводчики) латиницей не дублируем
    !p.hide_latin && !ruName && p.kind !== 'translator' && w?.en && w.en !== p.orig && { key: 'Латиницей', text: w.en },
    // Псевдонимы: другие имена, под которыми человек печатался, и настоящее имя, если в заголовке — псевдоним
    p.pseudonym && { key: 'Псевдоним', text: p.pseudonym },
    p.real_name && { key: 'Настоящее имя', text: p.real_name },
    p.kanji && { key: 'По-японски', kanji: p.kanji, kana: w?.kana ?? null },
    (w?.born || w?.died) && { key: 'Годы жизни', text: `${w.born ? w.born.text : '?'}${w.died ? ` – ${w.died.text}` : ''}` },
    w?.birthplace && { key: 'Место рождения', text: w.birthplace },
  ];
  return facts.filter((f): f is Fact => !!f);
}
