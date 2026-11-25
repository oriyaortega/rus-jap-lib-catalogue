// Приложение: загрузка каталога и Викиданных, выбор страницы по адресу
import { useEffect, useMemo, useState } from 'react';
import { CatalogContext } from './context';
import { Header, Main, Nav } from './components/Layout';
import { CatalogModel } from './lib/model';
import { loadWikidata } from './lib/wikidata';
import { useRoute, type Route } from './router';
import { AboutPage } from './pages/About';
import { AuthorPage } from './pages/Author';
import { BookPage } from './pages/Book';
import { EditionsPage } from './pages/Editions';
import { HomePage } from './pages/Home';
import { NonfictionPage } from './pages/Nonfiction';
import { NotFound } from './pages/NotFound';
import { AuthorsPage, TranslatorsPage } from './pages/People';
import { SearchPage } from './pages/Search';
import { SeriesPage } from './pages/Series';
import { TranslatorPage } from './pages/Translator';
import { WorksPage } from './pages/Works';
import { WorkPage } from './pages/Work';
import type { Catalog, WdMap, WdState } from './types';

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ok'; catalog: Catalog };

export function App() {
  const route = useRoute();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [wd, setWd] = useState<{ map: WdMap; state: WdState }>({ map: {}, state: 'loading' });

  useEffect(() => {
    fetch('data/catalog.json', { cache: 'no-cache' })
      .then((r) => r.json())
      .then((data: Partial<Catalog>) => {
        const catalog = { translators: [], news: [], series: [], ...data } as Catalog;
        setLoad({ status: 'ok', catalog });
        // сведения о людях — в фоне; после загрузки страница перерисуется
        loadWikidata(catalog).then(({ wd: map, state }) => setWd({ map, state }));
      })
      .catch((err) => { console.error(err); setLoad({ status: 'error' }); });
  }, []);

  const model = useMemo(() => (load.status === 'ok' ? new CatalogModel(load.catalog, wd.map, wd.state) : null), [load, wd]);

  // При переходе на другую страницу — наверх (replaceState при поиске и фильтрах прокрутку не сбрасывает)
  useEffect(() => {
    const onHash = () => window.scrollTo(0, 0);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const title = model ? pageTitle(route, model) : '';
  useEffect(() => {
    document.title = (title ? `${title} — ` : '') + 'Библиография японской литературы';
  }, [title]);

  return (
    <>
      <Header />
      <Nav section={route.section} />
      <Main>
        {load.status === 'loading' && <p>Загрузка…</p>}
        {load.status === 'error' && <p>Не удалось загрузить data/catalog.json. Откройте сайт через локальный сервер.</p>}
        {model && <CatalogContext.Provider value={model}><Page route={route} /></CatalogContext.Provider>}
      </Main>
    </>
  );
}

function Page({ route }: { route: Route }) {
  const { section, parts, params } = route;
  switch (section) {
    case '': return <HomePage />;
    case 'authors': return <AuthorsPage params={params} />;
    case 'author': return <AuthorPage key={parts[1]} id={parts[1]} />;
    case 'translators': return <TranslatorsPage params={params} />;
    case 'translator': return <TranslatorPage key={parts[1]} id={parts[1]} />;
    case 'works': return <WorksPage params={params} />;
    case 'work': return <WorkPage key={parts[1]} id={parts[1]} />;
    case 'editions': return <EditionsPage year={parts[1]} params={params} />;
    case 'nonfiction': return <NonfictionPage params={params} />;
    case 'search': return <SearchPage params={params} />;
    case 'book': return <BookPage key={parts[1]} id={parts[1]} />;
    case 'series': return <SeriesPage id={parts[1]} />;
    case 'about': return <AboutPage />;
    default: return <NotFound />;
  }
}

// Заголовок вкладки браузера
function pageTitle({ section, parts }: Route, m: CatalogModel): string {
  switch (section) {
    case 'authors': return 'Авторы';
    case 'author': return m.authorsById.get(parts[1])?.name_ru || '';
    case 'translators': return 'Переводчики';
    case 'translator': return m.translatorsById.get(parts[1])?.name_ru || '';
    case 'works': return 'Произведения';
    case 'work': return m.work(parts[1])?.title_ru || '';
    case 'editions': return 'Издания';
    case 'nonfiction': return 'Нехудожественная литература';
    case 'search': return 'Поиск';
    case 'book': return m.book(parts[1])?.title_ru || '';
    case 'series': return m.series(parts[1])?.name || '';
    case 'about': return 'О сайте';
    default: return '';
  }
}
