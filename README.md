# Библиография русскоязычной японской литературы

Каталог книг на русском языке: переводы японских авторов и книги о Японии. Оформление — по мотивам японской карточной игры карута.

- Сайт: <https://oriyaortega.github.io/rus-jap-lib-catalogue/>
- Документация: [docs/](docs/README.md)

## Устройство

Статический сайт на React 19 + TypeScript со сборкой Vite. Данные лежат в одном файле `data/catalog.json`, обложки и портреты — в `images/`. Сведения о людях дополнительно подгружаются в браузере из Викиданных и Википедии.

```
index.html            каркас страницы
src/                  код сайта: lib/ — логика (с тестами), components/, pages/
data/catalog.json     каталог
images/               обложки и портреты
tools/                сверка со старой версией сайта
docs/                 документация и скрипты импорта данных
.github/workflows/    сборка и публикация на GitHub Pages
```

Подробно: [Архитектура](docs/technical/architecture.md).

## Команды

Нужен Node.js 24 или новее.

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

- `npm run dev` — сайт на <http://localhost:5173/>;
- `npm test` — тесты логики (vitest);
- `npm run build` — статика в `dist/`, вместе с `data/` и `images/`;
- `npm run preview` — собранный сайт на <http://localhost:4173/>.

## Публикация

При каждом push в `main` GitHub Actions (`.github/workflows/pages.yml`) прогоняет тесты, собирает сайт и публикует `dist/` на GitHub Pages. Сборка в git не хранится. В настройках репозитория источник Pages — «GitHub Actions» (Settings → Pages → Build and deployment → Source).
