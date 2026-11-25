// Публикации произведений по данным Фантлаба (data/work-editions.json): загружаются один раз,
// при первом открытии страницы произведения, и дальше берутся из памяти
import { useEffect, useState } from 'react';
import type { WorkEditions } from '../types';

export type WorkEditionsState = { status: 'loading' } | { status: 'error' } | { status: 'ok'; data: WorkEditions };

let cache: Promise<WorkEditions> | null = null;
const load = () => (cache ??= fetch('data/work-editions.json', { cache: 'no-cache' }).then((r) => {
  if (!r.ok) throw new Error(`work-editions.json: ${r.status}`);
  return r.json() as Promise<WorkEditions>;
}).catch((e) => { cache = null; throw e; }));

export function useWorkEditions(): WorkEditionsState {
  const [state, setState] = useState<WorkEditionsState>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    load().then((data) => alive && setState({ status: 'ok', data }), (e) => { console.error(e); if (alive) setState({ status: 'error' }); });
    return () => { alive = false; };
  }, []);
  return state;
}
