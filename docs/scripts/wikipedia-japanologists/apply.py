"""Add missing Japanologists (Wikipedia list + 3 categories) and their books to data/catalog.json."""
import json, re, collections
P = r'PROJECT'
c = json.load(open(P + '/data/catalog.json', encoding='utf-8'))
persons = json.load(open('persons.json', encoding='utf-8'))
wbooks = json.load(open('wbooks.json', encoding='utf-8'))
qids = json.load(open('qids.json', encoding='utf-8'))
LIST = 'https://ru.wikipedia.org/wiki/Список_русскоязычных_японистов'
SRC = 'Википедия: «Список русскоязычных японистов»'
A = {a['id']: a for a in c['authors']}
T = {t['id']: t for t in c['translators']}
f = lambda s: (s or '').lower().replace('ё', 'е')
TL = str.maketrans({'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l',
                    'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh',
                    'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', '-': '', ' ': '', '.': ''})
def new_id(base, pool):
    b = f(base).translate(TL)[:24] or 'p'
    i, n = b, 2
    while i in pool: i, n = f'{b}{n}', n + 1
    return i

DEG = {'э': 'экономических', 'и': 'исторических', 'филол': 'филологических', 'филос': 'философских', 'полит': 'политических', 'ю': 'юридических',
       'г': 'географических', 'пед': 'педагогических', 'искусств': 'искусствоведения', 'техн': 'технических', 'психол': 'психологических',
       'социол': 'социологических', 'культурол': 'культурологии', 'с.-х': 'сельскохозяйственных', 'воен': 'военных', 'геогр': 'географических',
       'т': 'технических', 'культурологии': 'культурологии', 'юрид': 'юридических', 'ф': 'философских', 'соц': 'социологических'}
def bio_of(p):
    h = p['head']
    pre = re.split(r',\s*[кд]\.\s', h)[0]
    years = re.search(r'\((\d{4})\s*[—–-]\s*(\d{4})\)', pre) or re.search(r'\((\d{4})\)', pre)
    degs = []
    for kd, field, y in re.findall(r'\b([кд])\.\s*([а-я.\- ]+?)\s*н\.\s*\((\d{4})\)', h):
        key = field.strip(' .')
        name = DEG.get(key) or DEG.get(key.split('.')[0])
        if name:
            word = 'кандидат' if kd == 'к' else 'доктор'
            degs.append(f'{word} {"наук " if name in ("искусствоведения", "культурологии") else ""}{name}{"" if name in ("искусствоведения", "культурологии") else " наук"} ({y})')
    full = f"{p['sur']} {p['given']}{(' ' + p['pat']) if p.get('pat') else ''}".strip()
    life = ''
    if years:
        life = f' ({years.group(1)}–{years.group(2)})' if years.lastindex == 2 else f' (род. {years.group(1)})'
    extra = h[years.end():] if years else re.sub(r'^[^,]+,[^,(]+', '', h)
    extra = re.sub(r'\b[кд]\.\s*[а-я.\- ]+?\s*н\.\s*\(\d{4}\)', '', extra).strip(' ,;.')
    s = f'{full}{life} — японист'
    if degs: s += ', ' + ', '.join(degs)
    if extra and len(extra) < 120 and not re.search(r'\d', extra) and 'см.' not in extra: s += f'; {extra}'
    return s + '.'

# --- people
pid_of = {}          # pkey -> author id (or translator id for translator-only)
added_a, added_t, upd_wd = [], [], 0
pend_a = {}   # author records created only if some book needs them
for p in persons:
    key = p['sur'] + '|' + p['given'] + '|' + (p['pat'] or '')
    q = (qids.get(p.get('title') or '') or {}).get('q')
    if p['match']:
        ids = [pid for k, pid in p['match'] if k == 'a']
        if ids:
            pid_of[key] = ids[0]
        else:   # only a translator so far: make an author record too (same person)
            t0 = T[p['match'][0][1]]
            a = {'id': new_id(p['sur'] + p['given'][:6], A), 'wikidata': t0.get('wikidata') or q, 'name_ru': f"{p['sur']} {p['given']}", 'name_orig': None, 'sort': p['sur']}
            if p.get('pat') and not p['given'].endswith('.'): a['full_name'] = f"{p['sur']} {p['given']} {p['pat']}"
            pid_of[key] = a['id']; pend_a[a['id']] = a
        for k, pid in p['match']:
            x = (A if k == 'a' else T).get(pid)
            if x is not None and q and not x.get('wikidata'):
                x['wikidata'] = q; upd_wd += 1
        continue
    if p['given'].endswith('.'):
        name = f"{p['sur']} {p['given']}{(' ' + p['pat']) if p.get('pat') else ''}"
    else:
        name = f"{p['sur']} {p['given']}"
    a = {'id': new_id(p['sur'] + p['given'][:6], A), 'wikidata': q, 'name_ru': name, 'name_orig': None, 'sort': p['sur']}
    if p.get('pat') and not p['given'].endswith('.'):
        a['full_name'] = f"{p['sur']} {p['given']} {p['pat']}"
    if not q:
        a['bio'] = bio_of(p)
        a['bio_src'] = {'name': 'Википедия (список японистов)', 'url': LIST}
    c['authors'].append(a); A[a['id']] = a; added_a.append(a); pid_of[key] = a['id']

# lookup for co-authors "Фамилия И. О."
def find_author(sur, ini):
    i0 = ini[:1]
    for a in c['authors']:
        ws = (a.get('full_name') or a['name_ru']).split()
        if ws and f(ws[0]) == f(sur) and len(ws) > 1 and ws[1][:1] == i0:
            return a['id']
    a = {'id': new_id(sur + ini, A), 'wikidata': None, 'name_ru': f'{sur} {".".join(ini.replace(".", ""))}.', 'name_orig': None, 'sort': sur}
    c['authors'].append(a); A[a['id']] = a; added_a.append(a)
    return a['id']
def find_jp(name):
    for a in c['authors']:
        if f(a['name_ru']) in (f(name), f(' '.join(reversed(name.split())))):
            return a['id']
    a = {'id': new_id(name, A), 'wikidata': None, 'name_ru': name, 'name_orig': None, 'sort': name.split()[0]}
    c['authors'].append(a); A[a['id']] = a; added_a.append(a)
    return a['id']
def translator_for(key, person):
    p = next(x for x in persons if x['sur'] + '|' + x['given'] + '|' + (x['pat'] or '') == key)
    for k, pid in p['match']:
        if k == 't': return pid
    for t in c['translators']:
        if f(t['sort']) == f(p['sur']) and t['name_ru'].split()[-1][:1] == p['given'][:1]: return t['id']
    t = {'id': new_id(p['sur'] + p['given'][:6], T), 'wikidata': (qids.get(p.get('title') or '') or {}).get('q'),
         'name_ru': f"{p['sur']} {p['given']}", 'short': f"{p['given'][0]}. {p['sur']}", 'sort': p['sur']}
    c['translators'].append(t); T[t['id']] = t; added_t.append(t)
    return t['id']

def genre_tags(b):
    t = b['title'] + ' ' + b['resp']
    if b['role'] == 'translator':
        if re.search(r'[Пп]оэз|[Сс]тих|пятистиш|трехстиш|трёхстиш|хайку|хокку|танка|[Аа]нтолог|вака|[Кк]окинсю|[Сс]инкокинсю|[Мм]анъёсю|[Лл]ирик|[Уу]таавасэ', t): return 'поэзия', True
        if re.search(r'моногатари|[Пп]овест', t): return 'моногатари', True
        if re.search(r'[Дд]невник|[Зз]аписки|дзуйхицу', t): return 'дзуйхицу', True
        if re.search(r'[Пп]ьес|[Дд]рам|кёгэн|Кабуки|[Тт]еатр Но', t): return 'драма', True
        if re.search(r'[Сс]казк|[Лл]егенд|[Мм]иф', t): return 'сказки', True
        if re.search(r'[Рр]оман|[Рр]ассказ|[Нн]овелл|[Пп]роза', t): return 'новеллы', True
    if re.search(r'[Сс]ловар|[Сс]правочн|[Рр]азговорник|[Бб]иблиограф', t): return 'справочник', False
    if re.search(r'[Уу]чебн|[Пп]особ|[Сс]амоучит|[Кк]урс\b|[Хх]рестомат|[Пп]рактикум', t): return 'учебник', False
    if re.search(r'[Ии]скусств|[Жж]ивопис|[Аа]рхитектур|[Тт]еатр|[Кк]ино|[Сс]ад\b|[Гг]равюр|[Кк]ерамик|[Мм]узык|[Сс]кульпт', t): return 'искусство', False
    if re.search(r'[Ии]стори|[Сс]ёгунат|[Рр]еставрац|[Рр]еволюц|[Вв]ойн', t): return 'история', False
    if re.search(r'[Оо]черк|[Зз]аметк', t): return 'очерки', False
    return 'исследование', False

TOPIC = [('экономика', r'[Ээ]кономи|[Пп]ромышлен|[Фф]инанс|[Рр]ынок|рынк|[Тт]оргов|[Бб]изнес|[Кк]орпорац|[Мм]онопол|[Кк]апитал|[Бб]анк|[Нн]алог|[Ии]нвест|[Мм]енеджм|[Уу]правлен'),
         ('политика', r'[Пп]олитик|[Оо]тношени|[Вв]нешн|[Пп]арти|[Гг]осударств|[Пп]раво|[Кк]онституц|[Дд]ипломат|[Бб]езопасн'),
         ('язык', r'[Яя]зык|[Гг]рамматик|[Ии]ероглиф|[Лл]ексик|[Фф]онетик|[Пп]исьменност'),
         ('литературоведение', r'[Лл]итератур|[Пп]оэтик|[Пп]исател'),
         ('религия', r'[Бб]удд|[Сс]инто|[Дд]зэн|[Рр]елиги|[Кк]онфуци')]
seen = set()
added_b = []
for i, b in enumerate(wbooks):
    if b['dup']: continue
    k = (re.sub(r'\W', '', f(b['title']))[:40], b['year'])
    if k in seen: continue
    seen.add(k)
    genre, fiction = genre_tags(b)
    authors, trs = [], []
    if b['names']:
        pp = next(x for x in persons if x['sur'] + '|' + x['given'] + '|' + (x['pat'] or '') == b['pkey'])
        alias = {f(x) for x in re.findall(r'[А-ЯЁ][а-яё]+', pp['head'].split(',')[0] + ' ' + ((re.search(r'\((\D*?)\)', pp['head']) or [None, ''])[1] or ''))}
        authors = [pid_of.get(b['pkey']) if f(s) in alias else find_author(s, ini) for s, ini in b['names']]
    elif b['role'] == 'translator':
        trs = [translator_for(b['pkey'], b['person'])]
        if b['jp_author']: authors = [find_jp(b['jp_author'])]
    else:
        authors = [pid_of[b['pkey']]]
    authors = [a for a in dict.fromkeys(authors) if a]
    for a in authors:
        if a in pend_a and a not in A:
            c['authors'].append(pend_a[a]); A[a] = pend_a[a]
    note = []
    if b['resp']: note.append(b['resp'].rstrip('.') + '.')
    rest = re.sub(r'^\s*\d+\s*экз\.?\s*', '', b['rest']).strip(' .')
    if rest and len(rest) < 200: note.append(rest.rstrip('.') + '.')
    if b['subs']: note.append('Также: ' + '; '.join(s.rstrip('.') for s in b['subs'][:6]) + '.')
    tags = ['художественная' if fiction else 'нехудожественная', 'переводная' if trs else 'на русском', genre]
    for tg, rx in TOPIC:
        if re.search(rx, b['title']) and tg not in tags: tags.append(tg)
    bid = f'wj{i + 1}'
    nb = {'id': bid, 'title_ru': b['title'], 'authors': authors, 'year': b['year'], 'city': b['city'], 'publisher': b['publisher'], 'pages': b['pages'],
          'genre': genre, 'work_note': ' '.join(note) or None, 'links': [], 'sources': [SRC], 'added': '2026-11-23', 'translators': trs,
          'tags': tags, 'orig_year': None, 'title_orig': None, 'title_romaji': None}
    c['books'].append(nb); added_b.append(nb)
# existing books found in the list: add the source
B = {x['id']: x for x in c['books']}
src_added = 0
for b in wbooks:
    for d in b['dup'][:1]:
        x = B[d]
        if SRC not in (x.get('sources') or []):
            x['sources'] = (x.get('sources') or []) + [SRC]; src_added += 1
c['news'].insert(0, {'date': '2026-11-23', 'text': f'По «Списку русскоязычных японистов» и категориям Википедии «Японисты Российской империи», «Японисты СССР» и «Японисты России» добавлены {len([a for a in added_a if a["id"] in pid_of.values()])} японистов, которых не было в каталоге, и {len(added_b)} их книг. У {src_added} книг, уже имевшихся в каталоге, указан этот источник.'})
json.dump(c, open(P + '/data/catalog.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('authors added', len(added_a), '(japanologists', len([a for a in added_a if a['id'] in pid_of.values()]), ') translators added', len(added_t),
      'books added', len(added_b), 'sources added', src_added, 'wikidata set on existing', upd_wd)
