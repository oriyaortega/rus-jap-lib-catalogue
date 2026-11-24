// Каркас страницы: шапка, полоса хэри, меню с переключателем палитры
import { useState, type ReactNode } from 'react';
import { navKeyOf } from '../router';

export function Header() {
  return (
    <>
      <header className="masthead">
        <div className="page masthead-inner">
          <a href="#/" className="logo-fuda" aria-hidden="true" tabIndex={-1}>
            <span className="fuda-no">百</span>
            <span lang="ja">日本文学</span>
          </a>
          <a href="#/" className="home-link">
            <span className="kicker" lang="ja">にほんぶんがく · かるた</span>
            <span className="site-title">Библиография русскоязычной японской литературы</span>
          </a>
        </div>
      </header>
      <div className="heri" aria-hidden="true"></div>
    </>
  );
}

export const NAV_ITEMS: [string, string][] = [
  ['#/', 'Главная'],
  ['#/authors', 'Авторы'],
  ['#/translators', 'Переводчики'],
  ['#/works', 'Произведения'],
  ['#/editions', 'Издания'],
  ['#/nonfiction', 'Нехудожественная литература'],
  ['#/search', 'Поиск'],
  ['#/about', 'О сайте'],
];

export function Nav({ section }: { section: string }) {
  const key = navKeyOf(section);
  return (
    <nav className="topnav page" aria-label="Разделы">
      {NAV_ITEMS.map(([href, label]) => (
        <a key={href} href={href} aria-current={href.replace(/^#\/?/, '') === key ? 'page' : undefined}>{label}</a>
      ))}
      <PaletteToggle />
    </nav>
  );
}

// Переключатель «Цвет / Монохром»; выбор запоминается в браузере
function PaletteToggle() {
  const [color, setColor] = useState(() => document.documentElement.dataset.palette === 'color');
  const toggle = () => {
    const next = !color;
    if (next) document.documentElement.dataset.palette = 'color'; else delete document.documentElement.dataset.palette;
    try { localStorage.setItem('palette', next ? 'color' : 'mono'); } catch { /* недоступно */ }
    setColor(next);
  };
  return (
    <button type="button" id="palette-toggle" className="palette-toggle" aria-pressed={color} onClick={toggle}
      title={color ? 'Переключить на монохромный вариант' : 'Переключить на цветной вариант'}>
      <span className="sw" aria-hidden="true"></span><span className="lbl">{color ? 'Монохром' : 'Цвет'}</span>
    </button>
  );
}

export function Main({ children }: { children: ReactNode }) {
  return <main id="app" className="content page" tabIndex={-1}>{children}</main>;
}
