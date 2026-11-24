# Архитектура

Одностраничное приложение на React 19 и TypeScript, сборка — Vite, тесты — vitest. Сервера приложений нет: весь каталог загружается в браузер одним JSON-файлом, страницы строятся на клиенте. Сайт публикуется на GitHub Pages через GitHub Actions.

До 24 ноября 2026 г. сайт был написан на чистом JavaScript (`index.html`, `app.js`, `styles.css`). Как прошёл переход и как сверялись версии, описано в [Переходе на React](react-version.md).

## Файлы репозитория

| Путь | Назначение |
|---|---|
| `index.html` | каркас страницы для Vite: шрифты, скрипт палитры до отрисовки, `<div id="root">`, подключение `src/main.tsx` |
| `src/` | исходный код сайта, см. ниже |
| `data/catalog.json` | данные каталога (около 8 МБ), см. [Модель данных](data-model.md) |
| `images/` | обложки и портреты, плюс `_index.csv` с их происхождением, см. [Картинки](images.md) |
| `package.json`, `package-lock.json` | зависимости и команды (`npm run …`) |
| `vite.config.ts` | сборка, dev-сервер, копирование `data/` и `images/` в `dist/`, настройки vitest |
| `tsconfig*.json` | настройки TypeScript |
| `tools/` | сверка со старой версией, извлечение её из git, замеры скорости |
| `.github/workflows/pages.yml` | сборка и публикация на GitHub Pages |
| `docs/` | эта документация и [скрипты импорта](../scripts/README.md) |
| `dist/` | результат сборки; в git не хранится (`.gitignore`) |
| `.claude/launch.json` | настройки серверов для Claude Code (`catalog` — dev, `catalog-build` — сборка); в git не хранится |

## Исходный код (`src/`)

```
main.tsx, App.tsx      загрузка каталога и Викиданных, выбор страницы по адресу, заголовок вкладки
router.ts              адрес после «#»: разбор, ссылки с параметрами, replaceState для поиска и фильтров
context.ts             каталог для компонентов (useCatalog)
types.ts               типы данных catalog.json и Викиданных
styles.css             все стили сайта
lib/                   логика без React, покрыта тестами (*.test.ts)
  model.ts             CatalogModel: индексы, сведения о людях, эпохи и цвета, поиск, сортировки книг
  wikidata.ts          Викиданные (wbgetentities, кэш в localStorage) и вступления статей Википедии
  text.ts              склонение, японские цифры, нормализация для поиска, алфавит с Ё
  grouping.ts          группировки и сортировки: авторы, издания, нехудожественная литература
  people.ts            заголовок и строки сведений профиля
  colors.ts            цвета жанров и эпох
  sources.ts           подписи источников
  progressive.ts       порции ленивой отрисовки: сколько элементов и групп показать
  tags.ts, works.ts, translator.ts, home.ts, book.ts — логика отдельных страниц
components/            общие компоненты
  Layout.tsx           шапка, меню, переключатель палитры
  cards.tsx            торифуда (Fuda), ёмифуда (Yomifuda), колоды книг и людей
  Profile.tsx          профиль автора или переводчика с биографией
  LettersPage.tsx      перечень людей по алфавиту (карточки или список)
  BooksTable.tsx, Legend.tsx, switches.tsx, JumpNav.tsx, WorksList.tsx, links.tsx, common.tsx
pages/                 страница на каждый раздел
hooks/useProgressive.tsx  ленивая отрисовка длинных списков (см. «Страницы и функции»)
test/fixtures.ts       небольшой каталог для тестов
```

Правило: всё, что считает, сортирует, группирует или выбирает, пишется в `lib/` чистыми функциями и покрывается тестами. Компоненты только выводят результат.

## Запуск в браузере

1. Скрипт в `index.html` до отрисовки применяет сохранённую палитру (`localStorage.palette`), чтобы страница не мигала.
2. `App` загружает `data/catalog.json` с `cache: 'no-cache'` и создаёт `CatalogModel`. Это индексы:
   - `authorsById`, `translatorsById`;
   - книги каждого автора и переводчика;
   - `bookNo` — номер карточки, равный позиции книги в массиве плюс один.
3. Страница выбирается по адресу (`Page` в `App.tsx`).
4. В фоне `loadWikidata()` подгружает сведения о людях. Когда они приходят, создаётся новая модель, и страница перерисовывается.

Номер карточки зависит от позиции книги в `books`, поэтому новые книги всегда добавляются в конец массива. Иначе номера уже существующих карточек сдвинутся.

## Маршруты

Адрес страницы — часть URL после `#`, параметры — после `?`.

| Маршрут | Компонент |
|---|---|
| `#/` | `pages/Home.tsx` |
| `#/authors?view=list` | `AuthorsPage` в `pages/People.tsx` → `LettersPage` |
| `#/author/:id` | `pages/Author.tsx` |
| `#/translators` | `TranslatorsPage` в `pages/People.tsx` |
| `#/translator/:id` | `pages/Translator.tsx` |
| `#/works?sort=&q=&kind=` | `pages/Works.tsx` |
| `#/editions[/:year]?view=&sort=` | `pages/Editions.tsx` |
| `#/nonfiction?view=&sort=` | `pages/Nonfiction.tsx` |
| `#/search?q=&tags=&sort=&view=` | `pages/Search.tsx` |
| `#/book/:id` | `pages/Book.tsx` |
| `#/series/:id` | `pages/Series.tsx` |
| `#/about` | `pages/About.tsx` |

- Ссылки (вид, сортировка, год) меняют адрес обычным образом, страница прокручивается наверх.
- Поле поиска, теги, сортировка таблицы произведений и фильтр по виду меняют адрес через `replaceParams()` (`history.replaceState`). Новой записи в истории при этом нет, фокус и прокрутка сохраняются.

## Викиданные и Википедия на стороне браузера

- Запрос `wbgetentities` к `https://www.wikidata.org/w/api.php` с `origin=*`, пакетами по 50 QID. Берутся `labels`, `aliases`, `claims` и `sitelinks` для `ru`, `ja` и `en`.
- Второй запрос получает названия мест рождения (P19).
- Кеш хранится в `localStorage` под ключом `wd-cache-v2`, срок жизни — 7 дней.
- Биография: если у человека нет своего поля `bio`, компонент `Bio` загружает `https://ru.wikipedia.org/api/rest_v1/page/summary/<статья>`.
- Если Викиданные недоступны, сайт показывает только данные каталога.

Что именно берётся из Викиданных: [Викиданные и Википедия](../data-collection/wikidata-wikipedia.md).

## Поиск

`norm()` из `src/lib/text.ts` приводит строки к упрощённому виду:
- нижний регистр, без диакритики;
- ё и э → е, ш и щ → с, дж → дз, ч перед гласными → т;
- ou, oo → o; uu → u;
- без знаков препинания.

Благодаря этому «Мисима» находит «Мишима», а «Mishima» и «三島» тоже работают. Индекс (`CatalogModel.matches`) включает поля книги, имена авторов и переводчиков и их данные из Викиданных. Он строится при первом поиске.

## Команды

```powershell
npm install
```

```powershell
npm run dev
```

```powershell
npm test
```

```powershell
npm run build
```

```powershell
npm run preview
```

| Команда | Что делает |
|---|---|
| `npm install` | установить зависимости (один раз и после изменения `package.json`) |
| `npm run dev` | dev-сервер с горячей перезагрузкой: <http://localhost:5173/> |
| `npm test` | тесты логики (vitest); `npm run test:watch` — в режиме наблюдения |
| `npm run typecheck` | проверка типов TypeScript |
| `npm run build` | проверка типов и сборка статики в `dist/`: `index.html`, `assets/` и копии `data/` и `images/` |
| `npm run preview` | собранный `dist/` на <http://localhost:4173/> |
| `npm run legacy` | достать старую версию из git в `.legacy/` для сверки (см. [Переход на React](react-version.md)) |

Пути в сборке относительные (`base: './'`), поэтому `dist/` работает в любой подпапке, в том числе `/rus-jap-lib-catalogue/` на GitHub Pages.

## Кеш браузера

- Имена файлов JS и CSS в сборке содержат хеш содержимого, поэтому после публикации браузер сам загружает новые. Параметр `?v=N`, как в старой версии, больше не нужен.
- Каталог загружается с `cache: 'no-cache'`. Если браузер всё-таки показывает старые данные, выполните в консоли:
  ```js
  await fetch('data/catalog.json', {cache: 'reload'}); location.reload()
  ```

## Публикация (GitHub Pages)

- В настройках репозитория: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
- Workflow `.github/workflows/pages.yml` запускается при каждом push в `main`. Его также можно запустить вручную на вкладке Actions. Он выполняет:
  1. `npm ci`;
  2. `npm test`;
  3. `npm run build`;
  4. загрузку `dist/` как артефакта Pages;
  5. публикацию (`actions/deploy-pages`).
- Если тесты или сборка падают, сайт не обновляется, на Pages остаётся предыдущая версия.
- Адрес сайта: <https://oriyaortega.github.io/rus-jap-lib-catalogue/>. Публикация занимает около минуты, ход виден на вкладке **Actions**.
- `dist/` в git не хранится, его собирает только workflow.
