// Маршрутизация по адресу после «#», как в исходной версии: #/authors, #/author/mishima, #/search?q=…
import { useSyncExternalStore } from 'react';

const REPLACE_EVENT = 'hash-replace';

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  window.addEventListener(REPLACE_EVENT, cb);
  return () => {
    window.removeEventListener('hashchange', cb);
    window.removeEventListener(REPLACE_EVENT, cb);
  };
}
const getHash = () => location.hash;

export interface Route {
  hash: string;
  parts: string[];          // части пути: ['author', 'mishima']
  section: string;          // первый сегмент: '' для главной
  params: URLSearchParams;  // параметры после «?»
}

export function parseRoute(hash: string): Route {
  const [path, qs] = (hash.replace(/^#/, '') || '/').split('?');
  const parts = path.split('/').filter(Boolean);
  return { hash, parts, section: parts[0] || '', params: new URLSearchParams(qs || '') };
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash);
  return parseRoute(hash);
}

// Раздел меню, подсвечиваемый на странице: у страниц автора, переводчика — их перечни, у книги — ничего
export function navKeyOf(section: string): string {
  return ({ author: 'authors', translator: 'translators', book: '-' } as Record<string, string>)[section] ?? section;
}

// Поиск и фильтры: меняем адрес без новой записи в истории (и без прокрутки наверх)
export function replaceParams(page: string, mut: (p: URLSearchParams) => void) {
  const p = new URLSearchParams(location.hash.split('?')[1] || '');
  mut(p);
  [...p.keys()].forEach((k) => { if (!p.get(k)) p.delete(k); });
  const s = p.toString();
  history.replaceState(null, '', `#/${page}${s ? `?${s}` : ''}`);
  window.dispatchEvent(new Event(REPLACE_EVENT));
}

// Ссылка на страницу с теми же параметрами, изменёнными через mut; пустые параметры убираются
export function hrefWith(page: string, params: URLSearchParams, mut: (p: URLSearchParams) => void): string {
  const p = new URLSearchParams(params);
  mut(p);
  [...p.keys()].forEach((k) => { if (!p.get(k)) p.delete(k); });
  const qs = p.toString();
  return `#/${page}${qs ? `?${qs}` : ''}`;
}
