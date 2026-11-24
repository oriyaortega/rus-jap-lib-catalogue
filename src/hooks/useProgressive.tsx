// Ленивая отрисовка: сначала первая порция элементов, следующие — когда до конца списка остаётся около двух экранов.
// Переход к якорю (буква, группа) сначала дорисовывает список до нужного места, потом прокручивает.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { nextLimit } from '../lib/progressive';

// Отключение для сверки со старой версией и отладки: localStorage.lazy = 'off' — рисуется всё сразу
const lazyOff = (): boolean => { try { return localStorage.getItem('lazy') === 'off'; } catch { return false; } };

export interface Progressive {
  limit: number;                                     // сколько элементов показывать
  sentinel: ReactNode;                               // метка в конце списка; ставится после списка
  reveal: (index: number, targetId: string) => void; // дорисовать до элемента index и прокрутить к targetId
}

export function useProgressive(total: number, step: number, resetKey: string): Progressive {
  const off = lazyOff();
  const [state, setState] = useState({ key: resetKey, limit: step });
  // Новый список (другой адрес, запрос, сортировка) — снова с первой порции
  const limit = state.key === resetKey ? state.limit : step;
  if (state.key !== resetKey) setState({ key: resetKey, limit: step });

  const shown = off ? total : Math.min(limit, total);
  const more = shown < total;
  const ref = useRef<HTMLDivElement>(null);
  const pending = useRef<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!more || !el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setState((s) => ({ ...s, limit: nextLimit(s.limit, total, step) }));
    }, { rootMargin: '0px 0px 1500px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [more, total, step, shown]);

  // Прокрутка к якорю — после того как нужные элементы отрисованы
  useLayoutEffect(() => {
    if (!pending.current) return;
    const el = document.getElementById(pending.current);
    if (el) { pending.current = null; el.scrollIntoView({ behavior: 'smooth' }); }
  });

  const reveal = useCallback((index: number, targetId: string) => {
    pending.current = targetId;
    setState((s) => ({ ...s, limit: nextLimit(s.limit, total, step, index) }));
    // если элемент уже отрисован, состояние не меняется — прокручиваем сразу
    const el = document.getElementById(targetId);
    if (el) { pending.current = null; el.scrollIntoView({ behavior: 'smooth' }); }
  }, [total, step]);

  return {
    limit: shown,
    sentinel: more ? <div ref={ref} className="lazy-sentinel" aria-hidden="true" /> : null,
    reveal,
  };
}
