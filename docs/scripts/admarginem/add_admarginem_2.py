"""Ad Marginem, 27 ноября 2026 г.: две книги серии «hide books», которых не было в каталоге (сверка со всем магазином admarginem.ru/shop/).

Обложки скачаны с сайта издательства и обрезаны по правилу из docs/data-collection/covers-and-portraits.md
(images/cover_am17.jpg, images/cover_am18.jpg). Запуск из корня проекта: python -X utf8 add_admarginem_2.py
"""
import json

c = json.load(open('data/catalog.json', encoding='utf-8'))
A = {a['id']: a for a in c['authors']}
T = {t['id']: t for t in c['translators']}
AM = 'https://admarginem.ru/product/'
ADM = 'издательство Ad Marginem'
TODAY = '2026-11-27'


def translator(tid, name, short, sort):
    if tid not in T:
        t = {'id': tid, 'wikidata': None, 'name_ru': name, 'short': short, 'sort': sort}
        c['translators'].append(t); T[tid] = t
    return tid


tr17 = ['slaschevaanna', translator('klyuchakmargar', 'Ключак Маргарита', 'М. Ключак', 'Ключак'),
        translator('kolpenkoyuliya', 'Колпенко Юлия', 'Ю. Колпенко', 'Колпенко')]

if 'bio' not in A['tavadaeko']:
    A['tavadaeko']['bio'] = ('Ёко Тавада (род. 1960) — немецкая писательница японского происхождения, лауреат многих японских и немецких '
                             'литературных премий (в т. ч. премии Акутагавы 1993 года и медали Гёте 2005 года). Пишет на японском и немецком языках. '
                             'Выступает как поэт, прозаик, драматург, часто сотрудничает с художниками и музыкантами.')
    A['tavadaeko']['bio_src'] = {'name': ADM, 'url': AM + 'gde-nachinaetsya-evropa/'}


def book(id, slug, **f):
    b = {'id': id, 'title_ru': f['title'], 'authors': f['authors'], 'year': f['year'], 'city': 'Москва', 'publisher': 'Ad Marginem',
         'pages': f['pages'], 'isbn': f['isbn'], 'genre': f['genre'], 'work_note': f['note'] + f' Оригинальное название: {f["orig"]}.',
         'links': [{'name': 'Ad Marginem', 'url': AM + slug + '/'}], 'sources': [], 'added': TODAY, 'translators': f['trs'],
         'tags': f['tags'], 'orig_year': None, 'title_orig': None, 'title_romaji': None,
         'cover': f'images/cover_{id}.jpg', 'cover_src': AM + slug + '/', 'series': {'id': 'hidebooks'}}
    c['books'] = [x for x in c['books'] if x['id'] != id] + [b]
    return b


new = [
    book('am17', 'gde-nachinaetsya-evropa', title='Где начинается Европа', authors=['tavadaeko'], year=2026, pages=176,
         isbn='978-5-908038-83-6', genre='новеллы', trs=tr17, orig='どこからヨーロッパが始まる',
         tags=['художественная', 'переводная', 'новеллы'],
         note=('Сборник рассказов: рассказчица оказывается в Японии, России (Сибирь, Москва) и Германии и описывает фрагментарный мир, '
               'где даже город или человеческое тело могут оказаться своего рода текстом. Рассказы из разных авторских сборников, '
               'впервые переведённые на русский с японского и немецкого. Книга 2005 года по версии Times Literary Supplement.')),
    book('am18', 'filosofiya-turista', title='Философия туриста', authors=['adzumakhiroki'], year=2025, pages=400,
         isbn='978-5-91103-824-3', genre='очерки', trs=['matveenkovalent'], orig='観光客の哲学',
         tags=['нехудожественная', 'переводная', 'очерки', 'философия'],
         note=('Японский философ видит в фигуре туриста метафору Другого — способ бытия, отвечающий миру, где глобализация и национализм '
               'странным образом сосуществуют. Философский анализ, эссеистика, математика, поездки в Чернобыль, рассуждения о семье, '
               '«жутком», вторичном творчестве, интерфейсах и Достоевском.')),
]

# художественная книга должна относиться к произведению (см. catalog-regression.test.ts)
if not any(w['id'] == 'wc-am17' for w in c['works']):
    c['works'].append({'id': 'wc-am17', 'authors': ['tavadaeko'], 'title_ru': 'Где начинается Европа', 'title_orig': 'どこからヨーロッパが始まる',
                       'title_romaji': 'Doko kara Yōroppa ga hajimaru', 'kind': 'сборник', 'books': ['am17']})

if not c['news'][0]['text'].startswith('Добавлены ещё две книги Ad Marginem'):
    c['news'].insert(0, {'date': TODAY, 'text': 'Добавлены ещё две книги Ad Marginem из серии «hide books»: сборник рассказов «Где начинается Европа» '
                                              '{author:tavadaeko} и «Философия туриста» {author:adzumakhiroki}.'})

open('data/catalog.json', 'w', encoding='utf-8', newline='\n').write(json.dumps(c, ensure_ascii=False, indent=1))
idx = open('images/_index.csv', encoding='utf-8').read()
rows = [f'cover_{b["id"]}.jpg,обложка,{b["id"]},"{b["title_ru"]}",{b["cover_src"]}' for b in new if f'cover_{b["id"]}.jpg' not in idx]
if rows:
    open('images/_index.csv', 'a', encoding='utf-8', newline='\n').write(('' if idx.endswith('\n') else '\n') + '\n'.join(rows) + '\n')
print('ok', [b['id'] for b in new])
