# Скрипты импорта

Python-скрипты, которыми собирались и правились данные каталога. Они работали во временной папке, а около 17 ноября 2026 г. она была очищена. Большая часть скриптов **восстановлена из журнала сессии**: взята последняя записанная версия файла, и к ней заново применены правки. Отдельные мелкие правки могли не попасть, поэтому версии бывают не самыми последними.

**Входных данных (выгрузок с сайтов, CSV, текстов PDF) нет**, поэтому заново запустить конвейер нельзя. Скрипты нужны как описание приёмов и как основа для новых импортов. Процесс в целом описан в [Обзоре сбора данных](../data-collection/README.md).

В путях вместо локальных папок стоят условные имена:
- `SCRATCH` — рабочая папка с промежуточными файлами;
- `PROJECT` — корень репозитория;
- `PDF_DIR` — папка с PDF-библиографиями.

Перед запуском замените их на свои пути. Запуск: `python -I -X utf8 script.py` (см. [Заметки об инструментах](../maintenance/tooling-notes.md)).

## pipeline/ — первый конвейер (до 17 ноября)

| Файл | Назначение |
|---|---|
| `import_all.py` | главный сборщик: из `catalog_before_bulk.json` и данных всех источников собирал `catalog.json`; применял правки `demo_fixes.json`, `author_fixes.json`, `extra_books*.json`, `extra_series.json` и вызывал `apply_orig.py` и `localize_images.py` |
| `sources2.py` | вторая партия источников: «Азбука», «Бомбора», «Гиперион», Байбикова, Google-таблица, Мещеряков, «Поляндрия», ISBN с LiveLib; выполняется внутри `import_all.py` |
| `people.py` | `Registry` — сопоставление людей, нормализация имён, падежи, id (см. [Имена и люди](../data-collection/people-and-names.md)) |
| `readxlsx.py` | чтение .xlsx без openpyxl |
| `readmhtml.py` | текст и ссылки из сохранённой страницы .mhtml (Фантлаб) |
| `parse_works.py` | произведения из страницы расширенного поиска Фантлаба (страна — Япония) |
| `add_series.py` | серии и эпохи классиков |
| `receiver.py` | локальный приёмник данных из браузера (см. [Приёмы](../data-collection/web-techniques.md#как-вынести-данные-из-браузера)) |
| `build_demo_fixes.py`, `fix_h145.py` | правки отдельных карточек (демокниги, h1/h4/h5) |

## fantlab/

`fl_demo*.py` — сверка демокниг b1–b13 с Фантлабом. `fetch_work_years.py` — годы создания произведений через API Фантлаба.

Публикации произведений (`data/work-editions.json`):

1. `fetch_work_editions.py data/catalog.json <папка>` — скачивает `api.fantlab.ru/work/<id>/extended` для всех произведений с `fantlab`; уже скачанные пропускает. Около 1,5 с на произведение; можно запустить вторую копию с `--reverse`, она пойдёт с конца списка.
2. `build_work_editions.py data/catalog.json <папка> data/work-editions.json` — собирает файл и сопоставляет издания с книгами каталога (по ISBN, иначе по году, названию и автору).

После добавления произведений в `works` повторите оба шага.

## wikidata/

| Файл | Назначение |
|---|---|
| `fetch_orig.py`, `sparql_orig.py`, `apply_orig.py` | имена в оригинале (см. [Викиданные](../data-collection/wikidata-wikipedia.md#имена-в-оригинале-name_orig)) |
| `wd_match.py`, `wd_sparql.py` | поиск QID для авторов без сведений |
| `wd_status.py` | отчёт: у кого есть биография и портрет |
| `merge_bios.py` | сборка найденных биографий в правки авторов |

## ivran/

Каталог book.ivran.ru: `parse_ivb*.py` разбирают страницы, `ivb_select.py` отбирает книги о Японии, `ivb_build.py` строит книги, людей и дополнения к имеющимся записям.

## images/

`dl_images.py` скачивает все картинки и ведёт `_index.csv`. `localize_images.py` переводит каталог на локальные копии. `livelib_covers.py`, `apply_ll_covers.py` и `gb_covers.py` ищут обложки. См. [Обложки и портреты](../data-collection/covers-and-portraits.md).

## bibliography-pdf/

`pdf2txt.py` → `bib_parse.py` → `bib_secs.py` → `bib_books.py` → `bib_build.py`. См. [Печатные библиографии](../data-collection/pdf-bibliographies.md).

## app-patches/

Разовые правки `app.js` (старой версии сайта, до React) заменой строк, сделанные на раннем этапе: псевдонимы, источники, алфавит с Ё. Нужны только как история изменений, повторно не применяются.

## Актуальные скрипты (последние импорты, не восстановлены, а скопированы)

- `admarginem/add_admarginem.py` — книги Ad Marginem, серия «hide books», переводчики.
- `wikipedia-japanologists/` — `cats.py` → `parse_list.py` → `match.py` → `books.py` → `qids.py` → `apply.py`. См. [Японисты из Википедии](../data-collection/wikipedia-japanologists.md).

Эти скрипты правят `data/catalog.json` напрямую. Повторный запуск добавит записи второй раз: перед повтором откатите каталог (`git checkout data/catalog.json`).
