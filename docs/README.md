# Документация проекта «Библиография русскоязычной японской литературы»

Сайт-каталог книг на русском языке: переводы японских авторов и книги о Японии. Каталог статический: приложение на React + TypeScript (сборка Vite) и JSON-файл с данными. GitHub Actions собирает его и публикует на GitHub Pages.

- Сайт: <https://oriyaortega.github.io/rus-jap-lib-catalogue/>
- Репозиторий: <https://github.com/oriyaortega/rus-jap-lib-catalogue>

Состояние на 23 ноября 2026 г.: 4001 книга, 2142 автора, 364 переводчика, 162 серии, 805 произведений.

## Содержание

### Общее описание
- [О проекте](overview/project.md): цель, что показывает сайт, разделы.
- [Критерии отбора книг](overview/scope-rules.md): что входит в каталог и что нет.
- [История проекта](overview/history.md): хронология запросов и изменений.

### Техническая документация
- [Архитектура](technical/architecture.md): React + TypeScript + Vite, устройство кода, маршруты, команды, публикация через GitHub Actions.
- [Модель данных](technical/data-model.md): структура `data/catalog.json`, все поля.
- [Страницы и функции сайта](technical/pages.md): что показывает каждая страница и как устроены сортировки.
- [Оформление (карута)](technical/ui-design.md): карточки, цвета, шрифты, вёрстка.
- [Картинки](technical/images.md): папка `images/`, `_index.csv`, лицензии.
- [Переход на React + TypeScript](technical/react-version.md): как переписывали сайт и сверяли со старой версией.

### Сбор данных
- [Обзор процесса](data-collection/README.md): общий порядок работы с любым источником.
- [Источники](data-collection/sources.md): все источники, префиксы id и объёмы.
- [Приёмы работы с сайтами](data-collection/web-techniques.md): браузер, блокировки, VPN, 403/429, кодировки.
- [Викиданные и Википедия](data-collection/wikidata-wikipedia.md): имена в оригинале, годы жизни, биографии, SPARQL.
- [Печатные библиографии (PDF)](data-collection/pdf-bibliographies.md): разбор трёх томов «Библиографии Японии».
- [Японисты из Википедии](data-collection/wikipedia-japanologists.md): список и категории японистов.
- [Имена и люди](data-collection/people-and-names.md): сопоставление имён, псевдонимы, дубли.
- [Обложки и портреты](data-collection/covers-and-portraits.md): поиск, скачивание, обрезка.
- [Биографии авторов](data-collection/bios.md): поиск сведений, Perplexity, проверка фактов.

### Сопровождение
- [Как вносить изменения](maintenance/how-to.md): типовые задачи шаг за шагом.
- [Известные проблемы](maintenance/known-issues.md): ограничения данных и что можно доделать.
- [Заметки об инструментах](maintenance/tooling-notes.md): особенности окружения и типичные ошибки.

### Скрипты
- [Скрипты импорта](scripts/README.md): восстановленные Python-скрипты, которыми собирались данные.
