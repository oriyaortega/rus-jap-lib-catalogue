// Навигация по буквам (или группам): плавная прокрутка к якорю без смены адреса.
// Если список рисуется постепенно, onJump сначала дорисовывает его до нужного места (useProgressive.reveal).
import type { MouseEvent } from 'react';

export interface JumpItem { label: string; target: string; index: number }

export function JumpNav({ items, href, onJump }: { items: JumpItem[]; href: string; onJump: (index: number, target: string) => void }) {
  const click = (it: JumpItem) => (e: MouseEvent) => { e.preventDefault(); onJump(it.index, it.target); };
  return (
    <nav className="letters" aria-label="Буквы">
      {items.map((it, i) => <a key={i} href={href} data-jump={it.target} onClick={click(it)}>{it.label}</a>)}
    </nav>
  );
}
