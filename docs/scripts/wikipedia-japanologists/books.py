"""Books from the Wikipedia list of Russian-language Japanologists: classify works, parse, match against catalog."""
import json, re, collections
P = r'PROJECT'
c = json.load(open(P + '/data/catalog.json', encoding='utf-8'))
persons = json.load(open('persons.json', encoding='utf-8'))
_byname = {}
for _p in persons:
    if _p['given'] in ('Переводы',):
        _main = next(q for q in persons if q['sur'] == _p['sur'] and q is not _p)
        _main['works'] += _p['works']; _p['works'] = []
persons = [q for q in persons if q['given'] not in ('Переводы',)]

CITY = r'(?:М\.?\s*[-—–]\s*Л\.|М\.|Л\.|СПб\.|С\.-Петербург|Санкт-Петербург|Пг\.|Москва|Владивосток|Хабаровск|Новосибирск|Иркутск|Томск|Казань|Екатеринбург|Свердловск|Южно-Сахалинск|Калининград|Ростов-на-Дону|Нижний Новгород|Набережные Челны|Киев|Харьков|Минск|Ташкент|Алма-Ата|Тбилиси|Рига|Ереван|Баку|Улан-Удэ|Чита|Благовещенск|Магадан|Петропавловск-Камчатский|Омск|Пермь|Саратов|Самара|Воронеж|Ярославль|Краснодар|Красноярск|Барнаул|Тверь|Уфа|Токио|Kyoto|Tokyo|Нью-Йорк|Лондон|Париж|Берлин|Харбин|Шанхай|Пекин|Сеул|Варшава|Прага|Стокгольм|Хельсинки|Вологда|Тула|Ставрополь|Челябинск|Иваново|Смоленск|Кемерово|Курск|Брянск)'
IMP = re.compile(r'(?:^|[.;]\s+|\s—\s|\s)(' + CITY + r')\s*:\s*([^,;]{1,90}?)\s*[,.]\s*\[?((?:1[89]|20)\d\d)\]?(?:\s*[-—–]\s*\d{2,4})?\s*\.?(?:\s*(\d{1,4})\s*с\.?)?')
IMP2 = re.compile(r'(?:^|[.;]\s+|\s—\s|\s)(' + CITY + r')\s*,\s*((?:1[89]|20)\d\d)\s*\.?(?:\s*(\d{1,4})\s*с\.?)?')   # М., 1965. 32 с.
CITY_FULL = {'М.': 'Москва', 'Л.': 'Ленинград', 'СПб.': 'Санкт-Петербург', 'Пг.': 'Петроград'}
NAMES = re.compile(r'^((?:[А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?\s+(?:[А-ЯЁ]\.\s*){1,2}(?:,\s*|\s+и\s+))*[А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?\s+(?:[А-ЯЁ]\.\s*){1,2})(?:\(.*?\)\s*)?(?=[«"А-ЯЁA-Z0-9])')
ONE = re.compile(r'([А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?)\s+((?:[А-ЯЁ]\.\s*){1,2})')
f = lambda s: (s or '').lower().replace('ё', 'е')
norm = lambda s: re.sub(r'[^а-яa-z0-9]', '', f(s))
SKIP = re.compile(r'//|\bАД\b|\bАКД\b|\bДД\b|\bКД\b|дисс|Дисс|[Аа]втореф|\bРукопись|депонир|Деп\.|\bВып\.\s*\d+\.\s*С\.|\bС\.\s*\d+\s*[-—–]\s*\d+')

books, stats = [], collections.Counter()
for p in persons:
    prev = None
    for w in p['works']:
        t = w['t'].strip().rstrip('.')
        if w.get('sub'):
            if prev is not None and len(t) < 220:
                prev['subs'].append(t)
            continue
        prev = None
        if SKIP.search(t):
            stats['article/thesis'] += 1; continue
        m = IMP.search(t)
        if m:
            city, pub, year, pages = m.group(1), m.group(2).strip(' .'), int(m.group(3)), m.group(4)
        else:
            m = IMP2.search(t)
            if not m:
                stats['no imprint'] += 1; continue
            city, pub, year, pages = m.group(1), None, int(m.group(2)), m.group(3)
        head = t[:m.start()].strip(' .—')
        rest = t[m.end():].strip(' .')
        names = []
        mn = NAMES.match(head)
        alias = {f(x) for x in re.findall(r'[А-ЯЁ][а-яё\-]+', p['head'].split(',')[0] + ' ' + (re.search(r'\((.*?)\)', p['head']) or [None, ''])[1])}
        if mn:
            nn = [(s, i.replace(' ', '')) for s, i in ONE.findall(mn.group(1))]
            if any(f(s) in alias for s, i in nn):
                names = nn; head = head[mn.end():].strip()
        role = 'author'
        # responsibility after title: "/ Отв. ред. ..." or ". Под ред."
        title, resp = head, ''
        mr = re.search(r'\s/\s|\.\s+(?=(?:Пер\.|Под\s+(?:общ\.\s+)?ред|Отв\.\s*ред|Сост\.|Ред\.|Предисл|Вступ|Коммент|Авт\.|Изд\.\s*\d|\d-е\s+изд|Т\.\s*\d|В\s+\d+\s*т))', head)
        if mr:
            title, resp = head[:mr.start()], head[mr.end():]
        title = title.strip(' .:;—/')
        jp_author = None
        if re.search(r'[Пп]ер\.|[Пп]ерев', resp) and any(re.search(re.escape(a[:5]), f(resp)) for a in alias) and not names:
            role = 'translator'
            mj = re.match(r'([А-ЯЁ][а-яё]+(?:-[а-яё]+)?\s+[А-ЯЁ][а-яё]+(?:-[а-яё]+)?)\.\s+(?=[«А-ЯЁ])', title)
            if mj:
                jp_author = mj.group(1); title = title[mj.end():].strip()
        if len(title) < 3:
            stats['no title'] += 1; continue
        b = {'person': p['sur'] + ' ' + p['given'], 'pkey': p['sur'] + '|' + p['given'] + '|' + (p['pat'] or ''), 'role': role, 'jp_author': jp_author, 'match': p['match'], 'names': names, 'title': title, 'resp': resp.strip(' .'),
             'city': CITY_FULL.get(re.sub(r'\s', '', city), city) if not re.match(r'М\.?\s*[-—–]\s*Л', city) else 'Москва — Ленинград',
             'publisher': pub, 'year': year, 'pages': int(pages) if pages else None, 'rest': rest, 'raw': w['t'], 'subs': []}
        books.append(b); prev = b; stats['book'] += 1

# match against catalog
have = collections.defaultdict(list)
for b in c['books']:
    have[norm(b['title_ru'])[:22]].append(b)
OLD = [dict(b, _n=norm(b['title_ru'])) for b in c['books']]
for b in books:
    nt = norm(b['title'])
    cand = [x for x in OLD if x.get('year') and abs(x['year'] - b['year']) <= 1 and len(nt) >= 6 and
            (x['_n'].startswith(nt[:max(10, min(len(nt), 30))]) or nt.startswith(x['_n'][:max(10, min(len(x['_n']), 30))]))]
    mine = {pid for k, pid in b['match']}
    cand = [x for x in cand if set(x['authors']) & mine or set(x.get('translators') or []) & mine or (x['_n'] == nt and x['year'] == b['year'])]
    b['dup'] = [x['id'] for x in cand]
    stats['dup' if cand else 'new'] += 1
json.dump(books, open('wbooks.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(dict(stats))
import random
random.seed(5)
for b in random.sample([x for x in books if not x['dup']], 20):
    print('|', b['names'], '|', b['title'][:70], '|', b['city'], b['publisher'], b['year'], b['pages'], '|', b['resp'][:40])
