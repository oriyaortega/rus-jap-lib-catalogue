import { createContext, useContext } from 'react';
import type { CatalogModel } from './lib/model';

export const CatalogContext = createContext<CatalogModel | null>(null);

// Каталог для любого компонента внутри приложения (после загрузки данных)
export function useCatalog(): CatalogModel {
  const m = useContext(CatalogContext);
  if (!m) throw new Error('useCatalog: каталог ещё не загружен');
  return m;
}
