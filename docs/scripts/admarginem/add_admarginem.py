"""Add Ad Marginem books about Japan (author page of Ryoko Sekiguchi + search «япон») to data/catalog.json."""
import json, shutil, os
os.chdir(r'PROJECT')
D = 'SCRATCH/dl_am/'
c = json.load(open('data/catalog.json', encoding='utf-8'))
A = {a['id']: a for a in c['authors']}
T = {t['id']: t for t in c['translators']}
AM = 'https://admarginem.ru/product/'
ADM = 'издательство Ad Marginem'


def add_author(**a):
    if a['id'] not in A:
        c['authors'].append(a); A[a['id']] = a
    else:
        A[a['id']].update(a)


add_author(id='sekiguchiryoko', wikidata='Q454094', name_ru='Секигути Рёко', name_orig='関口涼子', sort='Секигути',
           bio='Рёко Секигути (род. 1970) — японская писательница, поэтесса и эссеистка, живущая во Франции; автор двух десятков книг стихов, прозы и эссе, написанных по-японски и по-французски. Изучала историю искусств в Сорбонне, получила докторскую степень по сравнительному литературоведению и культурологии в Токийском университете. Её излюбленная тема — языки эмоций: вкусы, запахи, переживания, а также то, как устроено время и как мы с ним «договариваемся».',
           bio_src={'name': ADM, 'url': 'https://admarginem.ru/book-author/ryoko_sekiguchi/'},
           links=[{'name': 'Ad Marginem', 'url': 'https://admarginem.ru/book-author/ryoko_sekiguchi/'}],
           image='images/person_sekiguchiryoko.jpg',
           image_src='https://admarginem.ru/wp-content/uploads/2022/09/La-eat-list-de-Ryoko-Sekiguchi-poetesse-de-la-cuisine-libanaise.jpg')
add_author(id='bartrolan', wikidata='Q179109', name_ru='Барт Ролан', name_orig=None, sort='Барт',
           bio='Ролан Барт (1915–1980) — французский философ, литературовед и критик, один из ведущих представителей структурализма. Изучал различные сферы культуры как семиотические системы, исследовал отношения языка и власти. Автор книг «Мифологии» (1957), «Фрагменты речи влюбленного» (1977), «Camera lucida» (1980).',
           bio_src={'name': ADM, 'url': AM + 'imperiya-znakov/'})
add_author(id='levistrossklod', wikidata='Q128126', name_ru='Леви-Стросс Клод', name_orig=None, sort='Леви-Стросс',
           bio='Клод Леви-Стросс (1908–2009) — французский этнолог, социолог и философ, создатель структурной антропологии. Преподавал в Бразилии, США, а с 1959 по 1982 год — в Коллеж де Франс; член Французской академии. Автор книг «Печальные тропики», «Структурная антропология», «Мифологики».',
           bio_src={'name': ADM, 'url': AM + 'obratnaya-storona-luny-zametki-o-yaponii/'})
add_author(id='tautbruno', wikidata='Q76729', name_ru='Таут Бруно', name_orig=None, sort='Таут',
           bio='Бруно Таут (1880–1938) — немецкий архитектор и градостроитель, один из крупнейших представителей архитектуры модернизма и движения «Новое строительство», известный цветными социальными жилыми комплексами в Берлине и Магдебурге. В 1933 году покинул нацистскую Германию и три с половиной года прожил в Японии.',
           bio_src={'name': ADM, 'url': AM + 'yaponskij-dom-i-ego-zhizn/'})
add_author(id='adzumakhiroki', wikidata='Q921584', name_ru='Адзума Хироки', name_orig='東浩紀', sort='Адзума',
           bio='Хироки Адзума (род. 1971) — японский культурный критик, писатель, независимый философ, основатель платформы и издательства «Гэнрон». Лауреат премий Mainichi и Suntory в области культуры, социальных и гуманитарных наук.',
           bio_src={'name': ADM, 'url': AM + 'opyt-o-solzheniczyne-prikosnovenie-veroyatnosti/'})
add_author(id='tsudzinobuo', wikidata='Q3541643', name_ru='Цудзи Нобуо', name_orig='辻惟雄', sort='Цудзи',
           bio='Нобуо Цудзи (род. 1932) — японский историк искусства, специалист по живописи периода Эдо. Внёс вклад в переоценку художников-«эксцентриков»: Ивасы Матабэя, Кано Сансэцу, Ито Дзякутю, Соги Сёхаку, Нагасавы Росэцу и Утагавы Куниёси.',
           bio_src={'name': ADM, 'url': AM + 'genealogiya-ekstsentrikov-ot-matabeya-do-kuniyosi/'})

y = A['miyamotoyuriko']
y['wikidata'] = y.get('wikidata') or 'Q464756'
y['name_orig'] = y.get('name_orig') or '宮本百合子'
if not y.get('bio'):
    y.update(bio='Миямото Юрико (1899–1951) — японская писательница, литературный критик, член Коммунистической партии Японии. В 1927–1930 годах вместе с русисткой Юасой Ёсико путешествовала по СССР; редактировала несколько пролетарских журналов, оставила обширное литературное наследие.',
             bio_src={'name': ADM, 'url': AM + 'cherez-novuyu-sibir/'})
k = A['kimrn']
k.update(name_ru='Ким Роман', full_name='Ким Роман Николаевич', wikidata=k.get('wikidata') or 'Q4220632')
if not k.get('bio'):
    k.update(bio='Роман Николаевич Ким (ок. 1899–1967) — советский писатель корейского происхождения, автор популярных шпионских романов, видный японовед и сотрудник контрразведки ОГПУ — НКВД. Родился в семье эмигрировавшего в Россию корейского националиста, получил образование в Японии.',
             bio_src={'name': ADM, 'url': AM + 'tri-doma-naprotiv-sosednikh-dva/'})
na = A['nakadzimaatsusi']
if not na.get('bio'):
    na.update(bio='Накадзима Ацуси (1909–1942) — японский прозаик, поэт, переводчик; был школьным учителем и чиновником, инспектировавшим школы на Южных морях (Микронезия). Известен переосмыслением китайских легенд; его роман «Свет, ветер и мечты» выдвигался на премию Акутагавы.',
              bio_src={'name': ADM, 'url': AM + 'atolly/'})

TL = str.maketrans({'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l',
                    'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh',
                    'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'})


def tr(sur, given):
    for t in c['translators']:
        if t['sort'] == sur and t['name_ru'].split()[-1][:1] == given[:1]:
            return t['id']
    tid = (sur + given[:6]).lower().translate(TL)
    while tid in T:
        tid += '2'
    t = {'id': tid, 'wikidata': None, 'name_ru': f'{sur} {given}', 'short': f'{given[0]}. {sur}', 'sort': sur}
    c['translators'].append(t); T[tid] = t
    return tid


if not any(s['id'] == 'hidebooks' for s in c['series']):
    c['series'].append({'id': 'hidebooks', 'name': 'hide books', 'publisher': 'Ad Marginem', 'city': 'Москва', 'years': '2025–',
                        'note': 'Серия издательства Ad Marginem, посвящённая Восточной Азии и Дальнему Востоку.',
                        'source': 'https://admarginem.ru/?s=%D1%8F%D0%BF%D0%BE%D0%BD&post_type=product'})


def book(id, title, authors, year, pages, isbn, genre, fiction, trs, note, slug, img, tags=(), series=False, orig=None):
    shutil.copy(D + img, f'images/cover_{id}.jpg')
    b = {'id': id, 'title_ru': title, 'authors': authors, 'year': year, 'city': 'Москва', 'publisher': 'Ad Marginem', 'pages': pages, 'isbn': isbn,
         'genre': genre, 'work_note': note + (f' Оригинальное название: {orig}.' if orig else ''),
         'links': [{'name': 'Ad Marginem', 'url': AM + slug + '/'}], 'sources': [], 'added': '2026-11-23', 'translators': trs,
         'tags': ['художественная' if fiction else 'нехудожественная', 'переводная' if trs else 'на русском', genre] + list(tags),
         'orig_year': None, 'title_orig': None, 'title_romaji': None, 'cover': f'images/cover_{id}.jpg', 'cover_src': AM + slug + '/'}
    if series:
        b['series'] = {'id': 'hidebooks'}
    return b


S = ['sekiguchiryoko']
new = [
    book('am1', 'Нагори. Тоска по уходящему сезону', S, 2023, 144, '978-5-908105-77-4', 'очерки', False, [tr('Попова', 'Алина')],
         'Эссе, построенное вокруг японского слова нагори — конец сезона, всё позднее, запоздалое, переходящее из реальности в воспоминания; это понятие важно для японского отношения к еде, к поэзии (хайку), ко времени.',
         'nagori-toska-po-uhodyashhemu-sezonu', 'sk_nagori.jpg', ['эссе'], orig='Nagori: La nostalgie de la saison qui vient de nous quitter'),
    book('am2', '961 час в Бейруте (и 321 блюдо, которое их сопровождало)', S, 2023, 288, '978-5-908105-85-9', 'очерки', False, [tr('Акимова', 'Ольга')],
         'Кулинарная хроника поездки в Бейрут в 2018 году: лирический травелог из множества микроглав, перекликающихся с блюдами и вкусами города, рассказы ливанцев о войне, ностальгии и революции.',
         '961-chas-v-bejrute-i-321-blyudo-kotoroe-ih-soprovozhdalo', 'sk_beirut.jpg', ['эссе', 'путевые заметки'],
         orig='961 heures à Beyrouth (et 321 plats qui les accompagnent)'),
    book('am3', 'Голос в темноте', S, 2024, 96, '978-5-91103-798-7', 'очерки', True, [tr('Шестаков', 'Алексей')],
         'Короткий текст на стыке дневниковых заметок, стихотворения в прозе и философского эссе — о переживании утраты и о голосе, способном звучать в настоящем даже после смерти человека.',
         'golos-v-temnote', 'sk_golos.jpg', ['эссе'], orig='La Voix sombre'),
    book('am4', 'Зов запахов', S, 2025, 272, '978-5-91103-850-2', 'очерки', False, [tr('Панайотти', 'Ольга')],
         'Дневник запахов: истории нескольких женщин разных стран и эпох, рассказанные через их обонятельные впечатления, вперемежку с цитатами и размышлениями о семиотической роли запахов.',
         'zov-zapahov', 'sk_zov.jpg', ['эссе'], orig='L’Appel des odeurs'),
    book('am5', 'Это не случайно. Японская хроника', S, 2025, 144, '978-5-91103-887-8', 'очерки', False, [tr('Чугунова', 'Татьяна')],
         'Хроника, которую автор вела в Париже после землетрясения, цунами и аварии на АЭС «Фукусима» 11 марта 2011 года: размышления о времени и памяти, о случайном и закономерном.',
         'eto-ne-sluchajno-yaponskaya-hronika', 'sk_sluch.jpg', ['эссе'], series=True, orig='Ce n’est pas un hasard. Chronique japonaise'),
    book('am6', 'Земля — это один большой котел', S, 2026, 64, '978-5-908038-80-5', 'очерки', False, [tr('Панайотти', 'Ольга')],
         'Маленькая лекция о связи вкуса, мышления и языка: приготовление и поглощение пищи как способ исследования мира.',
         'zemlya-eto-odin-bolshoj-kotel', 'sk_kotel.jpg', ['эссе'], orig='La terre est une marmite'),
    book('am7', 'Атоллы', ['nakadzimaatsusi'], 2025, 160, '978-5-908038-17-1', 'новеллы', True, ['yudinaekate'],
         'Сборник малой прозы: циклы «Истории Южных островов» (притчи и рассказы по местным мифам и преданиям) и «Атоллы» (лирический дневник странствий), написанные по впечатлениям от пребывания в Микронезии в 1941 году.',
         'atolly', 'am_atolly.jpg', series=True),
    book('am8', 'Через Новую Сибирь', ['miyamotoyuriko'], 2026, 240, '978-5-908038-37-9', 'очерки', False, ['slaschevaanna'],
         'Путевые заметки о трёхлетнем путешествии по СССР (с 1927 года) вместе с русисткой Юасой Ёсико: Москва и Ленинград, Транссибирская магистраль до Владивостока, наблюдения о жизни советских граждан, положении женщин и детей.',
         'cherez-novuyu-sibir', 'am_sibir.jpg', ['путевые заметки'], series=True, orig='新しきシベリアを横切る'),
    book('am9', 'Литературное, слишком литературное', ['akutagawa', 'tanidzakidzyun'], 2026, 256, '978-5-908038-89-8', 'очерки', False,
         [tr('Чертушкина', 'Евгения'), tr('Селимов', 'Мазай'), tr('Палагина', 'Саша')],
         'Полемика Акутагавы Рюноскэ и Танидзаки Дзюнъитиро на страницах журнала «Кайдзо» в 1920-е годы о природе сюжета, поэтическом духе и границах реализма; завершается статьями Танидзаки. Составитель А. Слащёва.',
         'literaturnoe-slishkom-literaturnoe', 'am_litlit.jpg', ['литературоведение'], series=True, orig='文芸的な、余りに文芸的な'),
    book('am10', 'Любовь и сладострастие. Избранные эссе', ['tanidzakidzyun'], 2027, 336, '978-5-908105-54-5', 'очерки', False, [tr('Селимов', 'Мазай')],
         'Четыре эссе 1925–1934 годов, написанные после переезда Танидзаки из разрушенного землетрясением Токио в Кансай; три публикуются на русском впервые, «Любовь и сладострастие» — в новой редакции. Комментарии и послесловие И. Тюленева и М. Селимова. Готовится к изданию (по данным издательства на ноябрь 2026 г.).',
         'lyubov-i-sladostrastie-izbrannye-esse', 'am_lyubov.jpg', ['эссе'], series=True, orig='恋愛及び色情'),
    book('am11', 'Опыт о Солженицыне. Прикосновение вероятности', ['adzumakhiroki'], 2026, 80, '978-5-908105-29-3', 'очерки', False, [tr('Матвеенко', 'Валентин')],
         'Взгляд японского философа на Солженицына через диалог с Достоевским, Хайдеггером и Кафкой: лагерный опыт как «неразрешимое» и понятие вероятности. Очерк 1991 года и интервью с автором 2026 года.',
         'opyt-o-solzheniczyne-prikosnovenie-veroyatnosti', 'am_solzh.jpg', ['литературоведение'], series=True, orig='ソルジェニーツィン試論 ── 確率の手触り'),
    book('am12', 'Три дома напротив соседних два', ['kimrn'], 2025, 352, '978-5-908038-36-2', 'очерки', False, [],
         'Сборник текстов японоведа и контрразведчика о культуре и литературе Японии 1920–1930-х годов, включая памфлет «Три дома напротив соседних два» (1934). Составители А. Слащёва и П. Жуков.',
         'tri-doma-naprotiv-sosednikh-dva', 'am_kim.jpg', ['литературоведение'], series=True),
    book('am13', 'Империя знаков', ['bartrolan'], 2023, 168, '978-5-91103-642-3', 'очерки', False, [tr('Янпольская', 'Яна')],
         '«Иллюстрированный путеводитель» по Японии — реальной и воображаемой, вдохновлённый поездками Барта и его увлечением хайку, каллиграфией, театром бунраку. Перевод (впервые вышел в 2004 году) в новой редакции, с комментарием и послесловием переводчика и редактора.',
         'imperiya-znakov', 'am_bart.jpg', ['о Японии'], orig='L’Empire des signes'),
    book('am14', 'Обратная сторона Луны. Заметки о Японии', ['levistrossklod'], 2027, 128, '978-5-908038-98-0', 'исследование', False, [tr('Лебедева', 'Елена')],
         'Очерки, выступления и интервью о японской культуре — от «Кодзики» и «Нихонги» до ремёсел и кухни, путевые заметки о Токио и островной глубинке, параллели между японскими и другими мифами. Предисловие Юндзо Кавады. Предзаказ (по данным издательства на ноябрь 2026 г.).',
         'obratnaya-storona-luny-zametki-o-yaponii', 'am_luna.jpg', ['о Японии'], orig='L’Autre Face de la lune. Écrits sur le Japon'),
    book('am15', 'Японский дом и его жизнь', ['tautbruno'], 2027, 368, '978-5-908105-55-2', 'исследование', False, [tr('Серов', 'Виталий')],
         'Книга, написанная в Японии в 1933–1936 годах, — об обычном сельском доме как ключе к архитектурной истории страны. Предисловие и научная редактура А. Гусевой. Готовится к изданию (по данным издательства на ноябрь 2026 г.).',
         'yaponskij-dom-i-ego-zhizn', 'am_taut.jpg', ['о Японии', 'архитектура'], orig='Das japanische Haus und sein Leben'),
    book('am16', 'Генеалогия эксцентриков: от Матабэя до Куниёси', ['tsudzinobuo'], 2018, 208, '978-5-91103-440-5', 'искусство', False, [tr('Дулина', 'Анна')],
         'Книга 1970 года, открывшая японским читателям «эксцентричных» живописцев эпохи Эдо: Иваса Матабэй, Кано Сансэцу, Ито Дзякутю, Сога Сёхаку, Нагасава Росэцу и Утагава Куниёси. Тираж закончился.',
         'genealogiya-ekstsentrikov-ot-matabeya-do-kuniyosi', 'am_tsudzi.jpg', orig='奇想の系譜'),
]
have = {b['id'] for b in c['books']}
c['books'] += [b for b in new if b['id'] not in have]
shutil.copy(D + 'portrait.jpg', 'images/person_sekiguchiryoko.jpg')
if not c['news'][0]['text'].startswith('Добавлены 16 книг издательства Ad Marginem'):
    c['news'].insert(0, {'date': '2026-11-23', 'text': 'Добавлены 16 книг издательства Ad Marginem о Японии: шесть книг {author:sekiguchiryoko}, серия «hide books» о Восточной Азии (Накадзима Ацуси, Миямото Юрико, Акутагава и Танидзаки, Хироки Адзума, Роман Ким), а также «Империя знаков» Ролана Барта, «Обратная сторона Луны» Клода Леви-Стросса, «Японский дом» Бруно Таута и «Генеалогия эксцентриков» Нобуо Цудзи.'})
json.dump(c, open('data/catalog.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
rows = [f'person_sekiguchiryoko.jpg,портрет,sekiguchiryoko,"Секигути Рёко",{A["sekiguchiryoko"]["image_src"]}'] + \
       [f'cover_{b["id"]}.jpg,обложка,{b["id"]},"{b["title_ru"]}",{b["cover_src"]}' for b in new]
p = 'images/_index.csv'
s = open(p, encoding='utf-8-sig').read().rstrip('\n')
s += '\n' + '\n'.join(r for r in rows if r.split(',')[0] + ',' not in s)
open(p, 'w', encoding='utf-8-sig').write(s + '\n')
print(len(c['books']), len(c['authors']), len(c['translators']))
