// Навигация по буквам (или группам): плавная прокрутка к якорю без смены адреса
import type { MouseEvent } from 'react';

export const jumpTo = (id: string) => (e: MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

export function JumpNav({ items, href }: { items: { label: string; target: string }[]; href: string }) {
  return (
    <nav className="letters" aria-label="Буквы">
      {items.map(({ label, target }, i) => <a key={i} href={href} data-jump={target} onClick={jumpTo(target)}>{label}</a>)}
    </nav>
  );
}
