"""Books from the three printed bibliographies «Библиография Японии» (1734–1917, 1917–1958, 1959–1973)
→ bib_extra_books.json (books) + bib_people.json (new authors / translators).
Input: bib/b19xx.json (entries from bib_parse.py), catalog to match people/duplicates against (argv[1])."""
import json, re, sys, collections, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from people import Registry, fold, genitive_to_nom
import bib_secs, bib_books

HERE = os.path.dirname(os.path.abspath(__file__))
D = bib_secs.D
cat = json.load(open(sys.argv[1], encoding='utf-8'))
A = Registry('author'); T = Registry('translator')
for a in cat['authors']: A.add(dict(a))
for t in cat['translators']: T.add(dict(t))
old_a, old_t = set(A.people), set(T.people)

VOL = {'b1917': ('bja', 'Библиография Японии. Литература, изданная в России с 1734 по 1917 г. (М., 1965)'),
       'b1958': ('bjb', 'Библиография Японии. Литература, изданная в Советском Союзе на русском языке с 1917 по 1958 г. (М., 1960)'),
       'b1973': ('bjc', 'Библиография Японии. Литература, изданная в Советском Союзе на русском языке с 1959 по 1973 г. (М., 1975)')}
SKIP_SECS = {None, 'Классики марксизма', 'Указатель'}
LAT = str.maketrans('XAВBEKMHOPCTYaeopcxy3', 'ХАВВЕКМНОРСТУаеорсху3')
LATI = str.maketrans('XABEKMHOPCTY3', 'ХАВЕКМНОРСТУЗ')

def clean(s):
    s = re.sub(r'\s+', ' ', s).strip()
    s = s.replace('„', '«').replace('“', '»').replace('>', '»').replace('^', '').replace('•', '')
    s = re.sub(r'\s+([.,;:!?)])', r'\1', s)
    s = re.sub(r'([(«])\s+', r'\1', s)
    s = re.sub(r'\.{2}(?!\.)', '.', s)
    return s.strip(' ,;—-')

CITY_FULL = [(r'^М\.?\s*[—-]\s*Л\.?$', 'Москва — Ленинград'), (r'^М\.?$', 'Москва'), (r'^Л\.?$', 'Ленинград'), (r'^СПб\.?$', 'Санкт-Петербург'),
             (r'^Пг\.?$', 'Петроград'), (r'^С\.-Петербург$', 'Санкт-Петербург'), (r'^Ростов.*', 'Ростов-на-Дону')]
def city_full(c):
    c = c.strip(' .,[]')
    for pat, full in CITY_FULL:
        if re.match(pat, c + ('.' if not c.endswith('.') else '')) or re.match(pat, c):
            return full
    return c

PUB_FULL = {'Худож. лит.': 'Художественная литература', 'Дет. лит.': 'Детская литература', 'Междунар. отношения': 'Международные отношения',
            'Сов. писатель': 'Советский писатель', 'Мол. гвардия': 'Молодая гвардия', 'Изд-во иностр. лит.': 'Издательство иностранной литературы',
            'Изд. иностр. лит-ры': 'Издательство иностранной литературы', 'Изд. вост. лит-ры': 'Издательство восточной литературы',
            'Изд-во вост. лит.': 'Издательство восточной литературы', 'Наука, Гл. ред. вост. лит.': 'Наука (Главная редакция восточной литературы)',
            'Изд-во АН СССР': 'Издательство АН СССР', 'Изд. Акад. наук СССР': 'Издательство АН СССР', 'Сов. Россия': 'Советская Россия',
            'Сов. энциклопедия': 'Советская энциклопедия', 'Сов. художник': 'Советский художник', 'Изд-во МГУ': 'Издательство МГУ',
            'Изд-во ЛГУ': 'Издательство ЛГУ', 'Изд. МГУ': 'Издательство МГУ', 'Изд. ЛГУ': 'Издательство ЛГУ', 'Изд-во ИМО': 'Издательство ИМО',
            'Изд-во ИМЭЛ': 'Издательство ИМЭЛ', 'Изд-во «Прогресс»': 'Прогресс', 'Знание': 'Знание', 'Гос. изд.': 'Госиздат'}
def pub_clean(p):
    p = clean(p).strip(' ,.')
    p = re.sub(r'^(?:изд\.|изд-во|издание)\s+', '', p)
    p = p.replace('«', '').replace('»', '').strip(' ,.')
    p = re.sub(r',?\s*Гл\.\s*ред\.\s*вост\.\s*лит\.?', ', Гл. ред. вост. лит.', p)
    p = re.sub(r',?\s*\[?1[789]\d\d\b.*$', '', p).strip(' ,.')
    for k, v in PUB_FULL.items():
        if p.replace('«', '').replace('»', '').rstrip('.') == k.replace('«', '').replace('»', '').rstrip('.'):
            return v
    if re.search(r'\.\s*М$|\sи\s+[А-ЯЁ]\.', p):
        return None
    return p or None

# --- names
NAME1 = r'\[?(?P<sur>[А-ЯЁ][а-яё]+(?:-[А-ЯЁ]?[а-яё]+)?)\]?\s*,?\s+\[?(?P<ini>(?:\[?[А-ЯЁXAВBEKMHOPCTY3]\.\]?\s*-?\s*){1,3})\]?'
AUTH = re.compile(r'^\s*(?P<all>' + NAME1 + r'(?:\s*,\s*' + NAME1.replace('?P<sur>', '').replace('?P<ini>', '') + r')*)\]?\.?(?:\s*и\s+др\.)?\s*(?=[«"(\[А-ЯЁA-Z0-9])')
ONE = re.compile(r'\[?([А-ЯЁ][а-яё]+(?:-[А-ЯЁ]?[а-яё]+)?)\]?\s*,?\s+\[?((?:\[?[А-ЯЁXAВBEKMHOPCTY3]\.\]?\s*-?\s*){1,3})\]?')

def person_author(sur, ini):
    ini = ini.translate(LATI).replace(' ', '').replace('[', '').replace(']', '')
    inits = re.findall(r'([А-ЯЁ])\.', ini)
    p = A.find(surname=sur, initial=inits[0] if inits else None)
    if p:
        return p['id']
    nm = f"{sur} {' '.join(i + '.' for i in inits)}".strip()
    p = {'wikidata': None, 'name_ru': nm, 'name_orig': None, 'sort': sur, 'japanese': False}
    A.add(p); A.reindex(p)
    return p['id']

def lev(a, b):
    if abs(len(a) - len(b)) > 2: return 9
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]
JP_OLD = [a for a in cat['authors'] if a.get('name_orig') or a.get('era')]
def fuzzy_jp(name):
    n = fold(name)
    best = None
    for a in JP_OLD + [x for x in A.people.values() if x.get('japanese')]:
        for cand in (a['name_ru'], ' '.join(reversed(a['name_ru'].split()))):
            d = lev(n, fold(cand))
            if d <= (2 if len(n) >= 10 else 1) and (best is None or d < best[0]):
                best = (d, a)
    return A.people.get(best[1]['id']) if best else None


def person_jp(name):
    name = re.sub(r'\s+', ' ', name.replace('*', '')).strip()
    if not name or name.lower().startswith(('неизвестн', 'то же', 'тоже')):
        return None
    p = A.find(name_ru=name)
    if not p:
        ws = name.split()
        if len(ws) == 2:
            p = A.find(name_ru=f'{ws[1]} {ws[0]}')
    if not p:
        p = fuzzy_jp(name)
    if p:
        return p['id']
    p = {'wikidata': None, 'name_ru': name, 'name_orig': None, 'sort': name.split()[0], 'japanese': True}
    A.add(p); A.reindex(p)
    return p['id']

def gen_nom(s):
    n = genitive_to_nom(s)
    if n != s:
        return n
    for a, b in (('ой', 'а'), ('ого', 'ий'), ('ей', 'ь')):
        if s.endswith(a) and len(s) > 4:
            return s[:-len(a)] + b
    if re.search(r'[бвгджзклмнпрстфхцчшщ]а$', s):
        return s[:-1]
    if re.search(r'[бвгджзклмнпрстфхцчшщ]я$', s):
        return s[:-1] + 'ь'
    return s

def translators_of(resp):
    out = []
    m = re.search(r'(?:Пер\.|Перевод|Пересказ\w*|Пересказала|Пересказал)(?:\s*,?\s*(?:с\s+[а-яё]+\.(?:\s*(?:и|,)\s*[а-яё]+\.)*(?:\s*изд\.)?|и|вступ\.|статья|предисл\.|примеч\.|коммент\.|указатель|послесл\.|сост\.|сокр\.|ред\.|\[|\]))*\s*'
                  r'((?:[А-ЯЁ3V]\.\s*(?:[А-ЯЁ3]\.\s*)?(?:и\s+[А-ЯЁV]\.\s*)?[А-ЯЁ][а-яё\-]+)(?:\s*(?:,|и)\s*(?:[А-ЯЁ3]\.\s*(?:[А-ЯЁ3]\.\s*)?[А-ЯЁ][а-яё\-]+))*)', resp)
    if not m:
        return out
    for part in re.split(r'\s*(?:,|\sи\s)\s*(?=[А-ЯЁ3V]\.)', m.group(1)):
        mm = re.match(r'([А-ЯЁ3V])\.\s*(?:[А-ЯЁ3]\.\s*)?([А-ЯЁ][а-яё\-]+)', part.strip())
        if not mm:
            continue
        ini = mm.group(1).replace('3', 'З').replace('V', 'В')
        sur = gen_nom(mm.group(2))
        p = T.find(surname=sur, initial=ini)
        if not p:
            p = {'wikidata': None, 'name_ru': f'{sur} {ini}.', 'short': f'{ini}. {sur}', 'sort': sur}
            T.add(p); T.reindex(p)
        out.append(p['id'])
    return list(dict.fromkeys(out))

RESP = re.compile(r'(?:^|(?<=[.\]\)»]))\s*(?=\[?(?:\[?Пер\.|Пер\s|Перевод|Пересказ|Под\s+(?:общ\.\s+)?ред|Ред\.|Сост\.|Составил|Составитель|Предисл\.|С\s+предисл|Вступ\.|Послесл\.|Коммент|Примеч|\[?Авт\.|Изд\.\s*(?:\d|2-е|3-е|испр|доп|перераб)|\d-е\s+изд|Отв\.\s*ред|Обраб\.|Илл\.|Рис\.|С\s+(?:илл|рис|портр|карт)|Худож\.|Автореферат|Отд\.\s*оттиск|Перевел|Пересказала|С\s+прилож))')

def split_title(pre):
    pre = clean(pre)
    m = RESP.search(pre)
    title, resp = (pre[:m.start()], pre[m.start():]) if m and m.start() > 3 else (pre, '')
    title = clean(title).rstrip('.')
    title = re.sub(r'^\[|\]$', '', title) if title.count('[') != title.count(']') else title
    return title, clean(resp)

def guess_genre(sec, title, body, pages):
    t = title + ' ' + body
    if sec == 'Переводы японской литературы':
        if re.search(r'[Сс]казк|[Сс]казани|[Лл]егенд', t): return 'сказки'
        if re.search(r'Роман\b|\bроман\b', t): return 'роман'
        if re.search(r'Пьес|Драм|Комеди|Трагеди|[Фф]арс|Кёгэн|Кабуки|Но\b', t): return 'драма'
        if re.search(r'Стих|Поэм|Танка|Хокку|[Пп]ятистиш|[Тт]рехстиш|[Тт]рёхстиш|Лирика|[Пп]оэз|[Пп]есн', t): return 'поэзия'
        if re.search(r'Повест|повест', t): return 'повесть'
        if re.search(r'[Рр]ассказ|[Нн]овелл|[Сс]борник', t): return 'новеллы'
        if re.search(r'[Зз]аписк|[Дд]невник', t): return 'дзуйхицу'
        return 'роман' if (pages or 0) >= 200 else 'повесть'
    if sec == 'Фольклор': return 'сказки'
    if re.search(r'[Сс]ловар|[Рр]азговорник|[Сс]правочник|[Бб]иблиограф|[Уу]казатель литер|[Кк]аталог', title): return 'справочник'
    if re.search(r'[Сс]амоучител|[Уу]чебник|[Уу]чебн\w+ пособ|[Пп]особие|[Хх]рестомати|[Кк]урс\b|[Пп]рописи|[Пп]рограмм', title): return 'учебник'
    if sec == 'Языкознание': return 'исследование'
    if sec == 'Искусство': return 'искусство'
    if sec in ('История', 'Милитаризм, агрессия', 'Русско-японская война'): return 'история'
    if sec == 'Путевые заметки': return 'очерки'
    if re.search(r'[Оо]черк|[Вв]печатлени|[Зз]аметки|[Пп]исьма', title): return 'очерки'
    return 'исследование'

SEC_TAGS = {'Экономика': ['экономика'], 'Внешняя политика': ['политика'], 'Милитаризм, агрессия': ['политика'], 'Государство и право': ['политика'],
            'Вооружённые силы': ['военное дело'], 'Русско-японская война': ['военное дело', 'Русско-японская война'], 'География, этнография': ['география'],
            'Путевые заметки': ['путевые заметки'], 'Религия': ['религия'], 'Философия': ['философия'], 'Языкознание': ['язык'],
            'Просвещение, наука': ['образование'], 'Печать': ['печать'], 'Японоведение': ['японоведение'], 'Литературоведение': ['литературоведение'],
            'Здравоохранение, спорт': ['спорт'], 'Искусство': [], 'История': [], 'Общие работы': [], 'Фольклор': ['фольклор'], 'Переводы японской литературы': []}
PARTIAL = re.compile(r'О\s+Японии\s+(?:см|—|на\s+стр)|\[О\s+Японии|Японии\s+посвящ|о\s+Японии\s+см|Япония\s*—\s*(?:с|стр)|Японии\s*—\s*(?:с|стр)\.|О Японии в|об? Японии:?\s*(?:с|стр)\.')

norm = lambda s: re.sub(r'[^а-яёa-z0-9]', '', (s or '').lower().replace('ё', 'е'))
have = collections.defaultdict(list)
for b in cat['books']:
    have[norm(b['title_ru'])[:28]].append(b)
OLD_BOOKS = [dict(b, _n=norm(b['title_ru'])) for b in cat['books']]

books, stats, skipped, dups = [], collections.Counter(), [], []
for f in ['b1917', 'b1958', 'b1973']:
    pref, volname = VOL[f]
    for e in json.load(open(D + f + '.json', encoding='utf-8')):
        sec = bib_secs.sec(f, e['page'])
        if sec in SKIP_SECS:
            continue
        c = bib_books.classify(e['text'])
        if not c:
            continue
        head = c['head']
        m = bib_books.BOOK.search(head) or bib_books.BOOK2.search(head)
        pre, imp, post = head[:m.start()], head[m.start():m.end()], head[m.end():]
        if PARTIAL.search(head):
            stats['partial'] += 1; continue
        if re.search(r'№\s*\d', pre + imp) or re.search(r'—\s*«[^»]{3,80}»\s*[,.]', pre):
            stats['journal'] += 1; continue
        if re.search(r'[Аа]втореферат|[Аа]втореф\.|на соиск', head):
            stats['autoref'] += 1; continue
        # imprint parts
        mm = re.match(r'\s*[—\-.]?\s*\[?(' + bib_books.CITY + r')\]?[,.]?\s*(.*?)\s*,?\s*\[?(?:(1[789]\d\d)\]?|б\.\s*г\.)?[.,]?\s*(?:[IVXLC\d]+,\s*)?(?:(\d{1,4})\s*(?:с|стр)|стр\.\s*(\d{1,4}))', imp)
        city = city_full(mm.group(1)) if mm else None
        pub = pub_clean(re.sub(r'\[?1[789]\d\d\]?$', '', mm.group(2)).strip(' ,')) if mm and mm.group(2) else None
        if pub and (re.fullmatch(r'[\d\s,.\[\]]*', pub) or len(pub) > 90):
            pub = None
        year = c['year'] or (int(mm.group(3)) if mm and mm.group(3) else None)
        pages = c['pages']
        # who/what
        jp = e.get('jp') if sec == 'Переводы японской литературы' else None
        pre_c = re.sub(r'^(\[?[А-ЯЁ][а-яё]+)([А-ЯЁ]\.)', r'\1 \2', clean(pre))
        authors = []
        mf = None if jp else re.match(r'^([А-ЯЁ][а-яё]+(?:-[а-яё]+)? [А-ЯЁ][а-яё]+(?:-[а-яё]+)?)\.\s+(?=[«А-ЯЁ])', pre_c)
        if mf and re.search(r'Пер\.|Перевод|Пересказ', pre_c) and not AUTH.match(pre_c):
            authors.append(person_jp(mf.group(1))); pre_c = pre_c[mf.end():]
        ma = AUTH.match(pre_c) if not jp else None
        if ma:
            for sur, ini in ONE.findall(ma.group('all')):
                authors.append(person_author(sur, ini))
            pre_c = pre_c[ma.end():]
        elif jp:
            a = person_jp(jp)
            if a: authors.append(a)
        else:
            mb = re.match(r'^[\[(]([А-ЯЁ][а-яё\-]+(?:\s+[А-ЯЁ][а-яё\-]+)?)\.?\s*[\])]\.?\s+(?=[«А-ЯЁ])', pre_c)
            if mb:
                nm = mb.group(1)
                p0 = A.find(name_ru=nm)
                if not p0:
                    p0 = {'wikidata': None, 'name_ru': nm, 'name_orig': None, 'sort': nm.split()[0], 'japanese': False}
                    A.add(p0); A.reindex(p0)
                authors.append(p0['id']); pre_c = pre_c[mb.end():]
        title, resp = split_title(pre_c)
        if not title or len(title) < 3:
            stats['notitle'] += 1; skipped.append((f, e['n'], head[:90])); continue
        if len(title) > 220:
            title = title[:220].rsplit(' ', 1)[0] + '…'
        trs = translators_of(resp)
        notes = []
        if resp:
            notes.append(resp.rstrip('.') + '.')
        sm = re.match(r'\s*[,.]?\s*(?:[IVXLC\d]+\s*,?\s*)?(?:(?:илл|ил|карт|схем|черт|табл|портр|граф|диагр)\.?\s*,?\s*)*(?:с\s+(?:ил|илл|карт)\.?\s*,?\s*)*\(([^()]{3,200})\)', post)
        if sm:
            notes.append('Серия: ' + clean(sm.group(1)).rstrip('.') + '.')
        for ann in re.findall(r'\[([^\[\]]{8,300})\]', post):
            if not re.search(r'Пер\.|изд\. \d', ann):
                notes.append(clean(ann).rstrip('.') + '.')
        if re.search(r'Т\s*о\s*ж\s*е', post):
            tz = clean(re.split(r'Т\s*о\s*ж\s*е', post, 1)[1])[:160]
            notes.append('Также: ' + tz.strip(' .—') + '.')
        sec_tags = SEC_TAGS.get(sec, [])
        genre = guess_genre(sec, title, pre_c, pages)
        fiction = sec in ('Переводы японской литературы', 'Фольклор')
        title = re.sub(r'\.\s*(?:Ист\.\s*|Истор\.\s*|Японский\s+|Современный\s+японский\s+)?(?:[Рр]оман|[Пп]овесть|[Рр]ассказ|[Рр]ассказы|[Сс]тихи|[Пп]ьеса|[Нн]овеллы|[Пп]овести|[Пп]овесть-сказка)\.?$', '', title).strip()
        key = norm(title)[:28]
        compat = lambda b: not authors or not b['authors'] or bool(set(authors) & set(b['authors']))
        dup = [b for b in have.get(key, []) if year and b.get('year') and abs(b['year'] - year) <= 1 and compat(b)
               and (not b['id'].startswith('bj') or (b['authors'] == authors and b['year'] == year))]
        if not dup and year:
            nt = norm(title)
            dup = [b for b in OLD_BOOKS if b.get('year') and abs(b['year'] - year) <= 1 and compat(b)
                   and (nt.startswith(b['_n']) or b['_n'].startswith(nt))
                   and (len(min(nt, b['_n'], key=len)) >= 12 or re.match(r'(стенограмма|краткийочерк|репортаж|сбстатей|статьи)', max(nt, b['_n'], key=len)[len(min(nt, b['_n'], key=len)):]))]
        if dup:
            dups.append((f, e['n'], title, dup[0]['id'], f'{volname}, № {e["n"]}')); stats['dup'] += 1; continue
        bid = f"{pref}{e['n']}"
        while any(b['id'] == bid for b in books):
            bid += 'a'
        b = {'id': bid, 'title_ru': title, 'authors': authors, 'year': year, 'city': city, 'publisher': pub, 'pages': pages,
             'genre': genre, 'work_note': ' '.join(notes) or None, 'links': [], 'sources': [f'{volname}, № {e["n"]}'],
             'added': '2026-11-09', 'translators': trs,
             'tags': ['художественная' if fiction else 'нехудожественная', 'переводная' if trs or jp or fiction else 'на русском', genre] + sec_tags,
             'orig_year': None, 'title_orig': None, 'title_romaji': None}
        books.append(b); stats[(f, 'fic' if fiction else 'non')] += 1
        have[key].append(b)

new_a = [A.people[k] for k in A.people if k not in old_a]
new_t = [T.people[k] for k in T.people if k not in old_t]
for p in new_a: p.pop('japanese', None)
json.dump(books, open(os.path.join(HERE, 'bib_extra_books.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
json.dump({'authors': new_a, 'translators': new_t}, open(os.path.join(HERE, 'bib_people.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
json.dump(dups, open(os.path.join(HERE, 'bib_dups.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('books', len(books), dict(stats))
print('new authors', len(new_a), 'new translators', len(new_t))
print('skipped', skipped[:10])
