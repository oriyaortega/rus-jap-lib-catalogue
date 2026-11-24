# Как вносить изменения

## Подготовка

Нужен Node.js 24 или новее.

```powershell
git pull
```

```powershell
npm install
```

```powershell
npm run dev
```

Сайт откроется на <http://localhost:5173/>. Правки в `src/` и в `data/catalog.json` видны сразу; данные — после перезагрузки страницы. Все команды: [Архитектура](../technical/architecture.md#команды).

## Правка каталога скриптом

`data/catalog.json` большой (около 8 МБ). Править его надёжнее небольшим скриптом на Python, а не вручную:

```python
import json
p = 'data/catalog.json'
c = json.load(open(p, encoding='utf-8'))
b = next(x for x in c['books'] if x['id'] == 'iv1371')
b.setdefault('links', []).append({'name': 'PDF на sengoku.ru', 'url': 'https://sengoku.ru/library/read/downloads/Konrad.pdf'})
json.dump(c, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
```

Запускать с `python -X utf8 script.py`, иначе в консоли Windows возможны ошибки кодировки. Сохраняйте формат `ensure_ascii=False, indent=1`. Тогда `git diff` покажет только изменённые строки. Проверить объём изменений: `git diff --stat`.

## Добавить книгу

1. Убедитесь, что такой книги нет: поиск по названию на сайте и в JSON.
2. Добавьте объект **в конец** `books` (поля см. в [Модели данных](../technical/data-model.md)). Обязательные поля: `id`, `title_ru`, `authors`, `translators`, `genre`, `tags`, `added`, `year`, `city`, `publisher`, `pages`, `title_orig`, `title_romaji`, `orig_year`, `work_note`, `sources`. Неизвестные значения пишите как `null`.
3. Новых авторов и переводчиков добавьте в `authors` / `translators` (см. [Имена и люди](../data-collection/people-and-names.md)).
4. Обложка: [Обложки и портреты](../data-collection/covers-and-portraits.md).
5. При необходимости серия: `series: {id, no}` и запись в `series`.

## Добавить другое издание той же книги

- Если отдельная карточка не нужна, добавьте элемент в `editions` основной книги.
- Если нужна, создайте карточку и укажите её id в `editions[].book`. Чтобы на странице автора не было повтора, поставьте карточке `hide_on_author: true`.

## Обновить сведения об авторе

- Биография: `bio` и `bio_src {name, url}`. Портрет: `image`, `image_src` и строка в `images/_index.csv`.
- `full_name` — для русских авторов, `name_orig` — иероглифы или латиница, `wikidata` — QID.
- Псевдоним: `pseudonym`. Отсылка в перечне: `aliases`.

## Изменить сайт (код и стили)

1. Отредактируйте файлы в `src/`. Логику (сортировки, группировки, расчёты) пишите в `src/lib/` и добавляйте к ней тесты рядом (`*.test.ts`). Компоненты — в `src/components/` и `src/pages/`. Стили — в `src/styles.css`. Устройство кода: [Архитектура](../technical/architecture.md#исходный-код-src).
2. Проверьте тесты и типы:
   ```powershell
   npm test
   ```
   ```powershell
   npm run typecheck
   ```
3. Проверьте на сайте (`npm run dev`) и в консоли браузера, в том числе на ширине 375 px.
4. Перед отправкой можно проверить сборку: `npm run build`, затем `npm run preview`.

## Отправить изменения

```powershell
git add -A
```

```powershell
git commit -m "Что сделано и откуда данные"
```

```powershell
git push
```

После push в `main` GitHub Actions сам прогоняет тесты, собирает сайт и публикует его на Pages (около минуты, ход — на вкладке Actions). Если тесты или сборка упали, сайт остаётся прежним; причина — в журнале запуска. `dist/` коммитить не нужно. Подробнее: [Публикация](../technical/architecture.md#публикация-github-pages).

Сообщения коммитов — по-русски. Push выполняется от аккаунта `oriyaortega`. Если git не может войти, войдите через браузер при запуске `git push` в своём терминале. Сайт на GitHub Pages обновится через минуту-две.

## Типовые проверки после импорта

```python
import json, collections
c = json.load(open('data/catalog.json', encoding='utf-8'))
ids = [b['id'] for b in c['books']]
assert len(ids) == len(set(ids)), 'повторяющиеся id книг'
A = {a['id'] for a in c['authors']}; T = {t['id'] for t in c['translators']}
print('нет автора:', [b['id'] for b in c['books'] if not set(b['authors']) <= A])
print('нет переводчика:', [b['id'] for b in c['books'] if not set(b['translators']) <= T])
```
