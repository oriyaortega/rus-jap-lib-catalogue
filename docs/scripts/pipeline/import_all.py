"""Import books and works from all sources the user named into data/catalog.json.

Sources (all read from this scratchpad):
  xlsx2.txt            – the user's spreadsheet, rows tagged 'japan' with Russian text
  inbox/ryabova.json   – Fantlab editions translated by Ekaterina Ryabova
  inbox/polyandria.json– Polyandria NoAge books by Japanese authors
  inbox/labirint.json  – Orientalia et Classica volumes about Japan
  works.json           – Fantlab advanced search «страна: Япония» (works with a Russian title)
  manual lists below   – V. V. Shchepkin (HSE profile) and E. S. Steiner (Wikipedia)
  inbox/wd_lookup.json – optional: Wikidata matches for people (title -> {q, ruwiki})

Usage: python import_all.py <catalog.json in> <catalog.json out> [--lookup-out lookup.json]
"""
import json, re, sys, collections, os
from people import (Registry, CYR, JA, fold, strip_paren, core_words, split_ru_name, genitive_to_nom, translit, is_initial)

HERE = os.path.dirname(os.path.abspath(__file__))
src_path, out_path = sys.argv[1], sys.argv[2]
lookup_out = sys.argv[sys.argv.index('--lookup-out') + 1] if '--lookup-out' in sys.argv else None
cat = json.load(open(src_path, encoding='utf-8'))
WD = {}
if os.path.exists(os.path.join(HERE, 'inbox', 'wd_lookup.json')):
    WD = json.load(open(os.path.join(HERE, 'inbox', 'wd_lookup.json'), encoding='utf-8'))

ADDED = '2026-11-08'
NONFIC = {'исследование', 'очерки', 'история', 'искусство', 'справочник', 'учебник'}

# ---------------------------------------------------------------- people
A = Registry('author'); T = Registry('translator')
for a in cat['authors']:
    A.add(dict(a))
for t in cat['translators']:
    T.add(dict(t))
lookups = {}   # person id -> candidate wiki titles


def wd_apply(p, cands):
    """Use a Wikidata match (if the browser lookup found one) to set QID and the surname-first Russian name."""
    for c in cands:
        hit = WD.get(c)
        if not hit:
            continue
        p['wikidata'] = p.get('wikidata') or hit['q']
        rw = re.sub(r'\s*\(.*\)$', '', hit.get('ruwiki') or '')
        if rw and ',' not in rw and len(rw.split()) == 2 and \
                sorted(fold(w) for w in rw.split()) == sorted(fold(w) for w in core_words(p['name_ru'])):
            p['name_ru'] = rw
            p['sort'] = rw.split()[0]
        elif rw and ',' in rw:
            sur, given = [x.strip() for x in rw.split(',', 1)]
            given = re.sub(r'\s*\(.*\)$', '', given)
            if fold(sur) in {fold(w) for w in core_words(p['name_ru'])}:
                gw = core_words(given)
                p['name_ru'] = f"{sur} {gw[0] if gw else ''}".strip() if p.get('japanese') is False else f'{sur} {given}'.strip()
                p['sort'] = sur
        return True
    return False


def get_author(name, kanji=None, order='auto', japanese=None, latin=None):
    name = re.sub(r'\s+', ' ', name.replace('\xa0', ' ')).strip()
    if not name or name in ('-', '—'):
        return None
    if japanese is None:
        japanese = bool(kanji)
    name = fix_latin(name).lstrip('(').strip()
    kanji = kanji.lstrip('(').strip() if kanji else kanji
    p = A.find(name_ru=name, kanji=kanji)
    if not p and not japanese:
        s0, g0 = split_ru_name(name, 'eastern' if order == 'eastern' else 'auto')
        inits = re.findall(r'([А-ЯЁ])\.', name)
        gi = g0[:1] if g0 else (inits[0] if inits else None)
        if gi:
            p = A.find(surname=s0, initial=gi)
            if p and g0 and len(g0) > 2 and re.search(r'[А-ЯЁ]\.', p['name_ru']):
                p['name_ru'] = f'{s0} {g0.split()[0]}'; A.reindex(p)
    if p:
        if kanji and not p.get('name_orig'):
            p['name_orig'] = kanji; A.reindex(p)
        return p['id']
    ws = core_words(name)
    if japanese:
        if order == 'eastern' or len(ws) < 2:
            sur, given = ws[0], ' '.join(ws[1:])
        else:  # western by default for Fantlab / publishers' sites
            sur, given = ws[-1], ' '.join(ws[:-1])
    else:
        sur, given = split_ru_name(name, 'eastern' if order == 'eastern' else 'auto')
        if not given:
            given = ' '.join(re.findall(r'[А-ЯЁ]\.', name))
    p = {'wikidata': None, 'name_ru': f'{sur} {given}'.strip(), 'name_orig': kanji, 'sort': sur, 'japanese': japanese}
    if not japanese:
        p['name_orig'] = None
    cands = []
    if kanji:
        cands.append('ja:' + re.sub(r'\s', '', kanji))
    if japanese and len(ws) >= 2:
        cands += [f'ru:{ws[-1]}, {" ".join(ws[:-1])}', f'ru:{ws[0]}, {" ".join(ws[1:])}', 'ru:' + ' '.join(ws), 'ru:' + ' '.join(reversed(ws))]
    if not japanese:
        full = [w for w in re.sub(r'\(.*?\)', ' ', name).split() if not is_initial(w)]
        if len(full) == 3:  # Фамилия Имя Отчество
            s, g = split_ru_name(name, 'eastern' if order == 'eastern' else 'auto')
            rest = [w for w in full if w != s]
            cands.append(f'ru:{s}, {" ".join(rest)}')
        elif latin and len(ws) == 2:
            cands.append(f'ru:{sur}, {given}')
    A.add(p)
    wd_apply(p, cands)
    if not p.get('wikidata'):
        lookups[p['id']] = cands
    A.reindex(p)
    return p['id']


def get_translator(name=None, surname=None, initial=None, order='auto', genitive=False):
    """Translator from a full name ('Вера Маркова', 'Львова Ирина Л.') or genitive initials ('Е. Рябовой')."""
    if name:
        name = re.sub(r'\s+', ' ', name.replace('\xa0', ' ')).strip(' ,')
        if not name or name in ('-', '—'):
            return None
        p = T.find(name_ru=name)
        if p:
            return p['id']
        sur, given = split_ru_name(name, order)
        p = T.find(surname=sur, initial=given[:1] if given else None)
        if p:
            if given and len(given) > 2 and p['name_ru'].endswith('.'):
                p['name_ru'] = f'{sur} {given.split()[0]}'; p['short'] = f'{given[0]}. {sur}'; T.reindex(p)
            return p['id']
        g0 = given.split()[0] if given else ''
        if not g0:
            g0 = ' '.join(re.findall(r'[А-ЯЁ]\.', name))
        full_parts = [w for w in name.split() if not is_initial(w)]
        p = {'wikidata': None, 'name_ru': f'{sur} {g0}'.strip(),
             'short': f'{g0[0]}. {sur}' if g0 else sur, 'sort': sur}
        T.add(p)
        if len(full_parts) == 3:
            pat = [w for w in full_parts if w not in (sur, g0)]
            cands = [f'ru:{sur}, {g0} {" ".join(pat)}']
            if wd_apply(p, cands) is False:
                lookups['T:' + p['id']] = cands
        return p['id']
    sur = genitive_to_nom(surname) if genitive else surname
    p = T.find(surname=sur, initial=initial)
    if p:
        return p['id']
    p = {'wikidata': None, 'name_ru': f'{sur} {initial}.' if initial else sur, 'short': f'{initial}. {sur}' if initial else sur, 'sort': sur}
    T.add(p)
    return p['id']


def parse_tr_list(s, order='auto', genitive=False):
    """Translator list. Fantlab contents use genitive initials ('перевод Е. Рябовой, А. Кабанова', genitive=True);
    the spreadsheet mixes 'В. Логунова', 'Ирина Львова', 'Корнилов М. Н.' (nominative)."""
    out = []
    s = fix_latin((s or '').replace('\xa0', ' ')).strip()
    if not s or s in ('-', '—'):
        return out
    for part in re.split(r',\s*(?=[А-ЯЁA-Z])', s):
        part = part.strip(' ,')
        if not part or re.fullmatch(r'[А-ЯЁ]\.(\s*[А-ЯЁ]\.)?', part):  # stray initials after 'Фамилия Имя Л.,'
            continue
        m = re.fullmatch(r'([А-ЯЁ])\.\s*(?:[А-ЯЁ]\.\s*)?([А-ЯЁ][а-яё\-]+)', part)
        if m:
            out.append(get_translator(surname=m.group(2), initial=m.group(1), genitive=genitive))
        else:
            out.append(get_translator(name=part, order=order))
    return [x for x in out if x]


def split_people(cell):
    """Spreadsheet author cell → separate names: commas, ' и ', or several «Фамилия Имя» pairs in a row."""
    cell = fix_latin((cell or '').replace('\xa0', ' ')).strip()
    if cell in ('', '-', '—'):
        return []
    m = re.match(r'^(\S+)\s+(\S+)\s+и\s+(\S+)(\s*\(.*\))?$', cell)   # «Елисеефф Вадим и Даниель»
    if m:
        return [f'{m.group(1)} {m.group(2)}', f'{m.group(1)} {m.group(3)}']
    out = []
    for part in re.split(r',\s*(?![^()]*\))', cell):
        part = part.strip()
        if part:
            out.append(part)
    return out


# ---------------------------------------------------------------- books
books = []
by_isbn = {}
series_by_name = {s['name']: s for s in cat.get('series', [])}


def isbn_key(s):
    if not s:
        return None
    d = re.sub(r'[^\dXx]', '', s.split(',')[0]).upper()
    return d if len(d) >= 10 else None


def series_ref(name, no=None):
    name = (name or '').strip()
    if not name or name in ('-', '—'):
        return None
    s = series_by_name.get(name)
    if not s:
        sid = translit(name)[:30] or f's{len(series_by_name)}'
        while any(x['id'] == sid for x in series_by_name.values()):
            sid += 'x'
        s = {'id': sid, 'name': name}
        series_by_name[name] = s
    r = {'id': s['id']}
    if no:
        r['no'] = no
    return r


GENRE_FROM_KIND = {'роман': 'роман', 'рассказ': 'новеллы', 'новелла': 'новеллы', 'повесть': 'повесть', 'сказка': 'сказки', 'стихотворение': 'поэзия',
                   'манга': 'манга', 'пьеса': 'драма', 'эссе': 'очерки', 'статья': 'исследование', 'микрорассказ': 'новеллы'}


def genre_from_contents(contents, fallback):
    c = collections.Counter(GENRE_FROM_KIND.get((w.get('k') or '').lower()) for w in contents)
    c.pop(None, None)
    return c.most_common(1)[0][0] if c else fallback


def add_book(b):
    b.setdefault('added', ADDED)
    b.setdefault('translators', [])
    b.setdefault('authors', [])
    b.setdefault('tags', [])
    b.setdefault('orig_year', None)
    b.setdefault('title_orig', None)
    b.setdefault('title_romaji', None)
    b.setdefault('work_note', None)
    b['authors'] = list(dict.fromkeys(a for a in b['authors'] if a))
    b['translators'] = list(dict.fromkeys(t for t in b['translators'] if t))
    nonfic = b['genre'] in NONFIC
    tags = ['нехудожественная' if nonfic else 'художественная', 'переводная' if b['translators'] else 'на русском', b['genre']] + b['tags']
    if b['genre'] == 'манга':
        tags.append('манга')
    b['tags'] = list(dict.fromkeys(t for t in tags if t))
    k = isbn_key(b.get('isbn'))
    if k and k in by_isbn:
        old = by_isbn[k]
        for f, v in b.items():
            if f in ('id', 'added'):
                continue
            if f in ('authors', 'translators', 'tags'):
                old[f] = list(dict.fromkeys(old[f] + v))
            elif f == 'contents':
                if v and len(v) > len(old.get('contents') or []):
                    old['contents'] = v
            elif not old.get(f) and v:
                old[f] = v
        old.setdefault('sources', []).extend(b.get('sources', []))
        return old
    if k:
        by_isbn[k] = b
    books.append(b)
    return b


def imprint(s):
    """'Худ. лит., Москва' -> ('Художественная литература', 'Москва')"""
    s = (s or '').strip()
    if not s or s in ('-', '—'):
        return None, None
    if ',' in s:
        pub, city = s.rsplit(',', 1)
    else:
        pub, city = (None, s) if s in ('Владивосток',) else (s, None)
    pub = (pub or '').strip().strip('«»') or None
    city = (city or '').strip() or None
    ab = {'Худ. лит.': 'Художественная литература', 'Дет. Лит.': 'Детская литература', 'Изобразительное иск.': 'Изобразительное искусство',
          '«ЭКСМО»': 'Эксмо', 'ЭКСМО': 'Эксмо', 'ВШЭ': 'Издательский дом ВШЭ'}
    pub = ab.get(pub, pub)
    city = {'С.-Петербург': 'Санкт-Петербург', 'СПб.': 'Санкт-Петербург', 'М.': 'Москва', 'Л.': 'Ленинград'}.get(city, city)
    return pub, city


# ---------- 1. the user's spreadsheet
XGENRE = {0: 'учебник', 1: 'манга', 2: 'манга', 3: 'очерки', 4: 'новеллы', 5: 'история', 6: 'справочник', 7: 'справочник', 8: 'справочник', 9: 'история',
          10: 'драма', 11: 'история', 13: 'поэзия', 15: 'искусство', 16: 'сказки', 17: 'поэзия', 18: 'сказки', 19: 'справочник', 20: 'новеллы',
          35: 'моногатари', 36: 'поэзия', 37: 'драма', 38: 'искусство', 39: 'искусство', 41: 'новеллы', 42: 'исследование', 43: 'исследование',
          44: 'исследование', 45: 'искусство', 47: 'искусство', 48: 'искусство', 49: 'история', 50: 'исследование', 51: 'исследование',
          52: 'исследование', 53: 'исследование', 54: 'история', 55: 'искусство', 56: 'исследование', 57: 'история', 58: 'искусство',
          59: 'новеллы', 60: 'новеллы', 61: 'дзуйхицу', 62: 'новеллы', 63: 'повесть', 64: 'повесть', 65: 'новеллы', 66: 'новеллы', 67: 'очерки',
          68: 'очерки', 69: 'новеллы', 70: 'исследование', 71: 'искусство', 72: 'исследование', 73: 'очерки', 74: 'очерки', 75: 'история',
          76: 'искусство', 77: 'история', 78: 'история', 79: 'манга', 80: 'манга', 81: 'манга', 82: 'роман', 83: 'роман', 84: 'сказки',
          86: 'искусство', 87: 'очерки', 88: 'роман', 89: 'очерки', 90: 'очерки', 91: 'искусство', 92: 'роман', 93: 'история', 94: 'исследование',
          95: 'история', 98: 'очерки', 99: 'роман', 100: 'дзуйхицу', 101: 'исследование', 102: 'учебник', 103: 'искусство', 104: 'новеллы',
          105: 'роман', 106: 'роман', 107: 'роман', 108: 'исследование', 112: 'история', 114: 'сказки', 115: 'роман', 116: 'новеллы',
          117: 'манга', 118: 'искусство', 119: 'сказки', 120: 'поэзия', 121: 'искусство', 122: 'исследование', 123: 'искусство', 124: 'искусство',
          125: 'искусство', 126: 'искусство', 127: 'искусство', 128: 'поэзия', 129: 'исследование', 130: 'роман', 131: 'исследование',
          132: 'история', 133: 'очерки', 134: 'новеллы', 135: 'моногатари', 136: 'роман', 137: 'роман', 138: 'роман', 139: 'новеллы',
          140: 'роман', 141: 'роман', 142: 'роман', 143: 'очерки', 144: 'роман', 145: 'роман', 146: 'сказки'}
for i in range(21, 35):
    XGENRE[i] = 'исследование'
X_SKIP = {40: 'на латышском', 113: 'на английском', 46: 'статья/диссертация без выходных данных', 96: 'статья без выходных данных',
          97: 'статья без выходных данных', 109: 'статья без выходных данных', 110: 'статья без выходных данных',
          85: 'входит в том «Повесть о прекрасной Отикубо» (1988), уже есть в каталоге'}
X_WORK_ONLY = {12, 14, 111}   # нет издания — вносим как произведения

rows = [(l.rstrip('\n').split('\t') + [''] * 14)[:14] for l in open(os.path.join(HERE, 'xlsx2.txt'), encoding='utf-8')][3:]
jr = [f for f in rows if f[10] == 'japan' and CYR.search(f[3] + f[4] + f[5])]
groups = collections.OrderedDict()
for f in jr:
    groups.setdefault((f[4].strip(), f[5].strip(), f[6].strip()), []).append(f)

extra_works = []
skipped = []
for idx, ((book_title, imp, year), rs) in enumerate(groups.items()):
    if idx in X_SKIP:
        skipped.append((book_title, X_SKIP[idx]))
        continue

    def author_of(f):
        nm, kanji, lat = strip_paren(f[2])
        return get_author(nm, kanji, order='eastern', japanese=bool(kanji) or None, latin=lat) if nm not in ('-', '') else None

    if idx in X_WORK_ONLY:
        f = rs[0]
        t, tj, _ = strip_paren(f[3])
        extra_works.append({'authors': [a for a in [author_of(f)] if a], 'title_ru': t, 'title_orig': tj, 'kind': None,
                            'translators': parse_tr_list(f[9]), 'source': 'xlsx'})
        continue
    pub, city = imprint(imp)
    title_ru, title_ja, _ = strip_paren(book_title)
    contents = []
    for f in rs:
        t, tj, _ = strip_paren(f[3])
        contents.append({'a': author_of(f), 't': t, 'o': tj, 'k': None, 'tr': parse_tr_list(f[9])})
    auths = [c['a'] for c in contents if c['a']]
    distinct = list(dict.fromkeys(auths))
    b = {'id': f'x{idx + 1}', 'title_ru': title_ru, 'title_orig': title_ja,
         'year': int(year) if year.isdigit() else None, 'city': city, 'publisher': pub,
         'pages': None, 'isbn': (rs[0][7].strip() if rs[0][7].strip() not in ('-', '') else None),
         'genre': XGENRE.get(idx, 'проза'), 'sources': ['xlsx']}
    sr = series_ref(rs[0][8])
    if sr:
        b['series'] = sr
    b['authors'] = distinct if len(distinct) <= 3 else []
    b['translators'] = [t for c in contents for t in c['tr']]
    if len(contents) > 1 or (contents and fold(contents[0]['t']) != fold(title_ru)):
        b['contents'] = [{k: v for k, v in c.items() if v} | {'tr': c['tr']} for c in contents]
        if len(distinct) > 3:
            b['tags'] = ['антология']
    if len(contents) == 1 and contents[0].get('o') and not b['title_orig']:
        b['title_orig'] = contents[0]['o']
    # existing demo book with the same title and year (e.g. «Ветка сакуры», 1971) is the same edition
    dup = next((x for x in cat['books'] if fold(x['title_ru']) == fold(title_ru) and x['year'] == b['year']), None)
    if dup:
        dup.update({k: v for k, v in b.items() if v and k not in ('id', 'genre', 'authors', 'translators')})
        dup.setdefault('sources', []).append('xlsx')
        continue
    add_book(b)

# ---------- 2. Ryabova's editions on Fantlab
R = json.load(open(os.path.join(HERE, 'inbox', 'ryabova.json'), encoding='utf-8'))
MANUAL_IMPRINT = {'304532': ('Санкт-Петербург', 'Жёлтый двор', 2020), '477436': ('Санкт-Петербург', 'Жёлтый двор', 2025)}
CONTENT_RE = re.compile(r'^(?P<head>.+?)\s\((?P<inner>[^()]*(?:\([^()]*\)[^()]*)*)\)(?:,\s*(?:стр|с)\.\s*(?P<p>[\d\s\-–]+))?\s*$')


def parse_content_line(line, book_authors):
    m = CONTENT_RE.match(line)
    if not m:
        return None
    head, inner = m.group('head'), m.group('inner')
    parts = [x.strip() for x in inner.split(',')]
    kind = parts[0]
    tr = re.search(r'перевод\s+(.+?)(?:,\s*иллюстрации.*)?$', inner)
    a, at, title = None, None, head
    mm = re.match(r'^((?:[А-ЯЁ]\.\s*)*[А-ЯЁ][а-яё\-]+(?:\s[А-ЯЁ][а-яё\-]+)?(?:,\s*[А-ЯЁ][а-яё\-]+(?:\s[А-ЯЁ][а-яё\-]+)?)*)\.\s+(.+)$', head)
    if mm:
        who, title = mm.group(1), mm.group(2)
        found = A.find(name_ru=who)
        if found:
            a = found['id']
        elif kind in ('статья', 'предисловие', 'послесловие', 'комментарии', 'предисловие переводчика', 'вступительная статья') or is_initial(who.split()[0]):
            at = who
        else:
            a = get_author(who, japanese=True)
    w = {'t': title.strip(), 'k': kind, 'tr': parse_tr_list(tr.group(1)) if tr else []}
    if a:
        w['a'] = a
    if at:
        w['at'] = at
    if m.group('p'):
        w['p'] = m.group('p').strip().replace('-', '–')
    return w


ryab = get_translator(name='Рябова Екатерина', order='eastern')
for o in R:
    head = o.get('head', '')
    hp = [x.strip() for x in head.split('|')]
    first = hp[0]
    mt = re.match(r'^(.*?)\s*«(.+)»$', first)
    au_str, title = (mt.group(1).strip(), mt.group(2).strip()) if mt else ('', first.strip('«»'))
    comic = 'комикс' in head
    city, pub, year = o.get('city'), o.get('pub'), o.get('year')
    if o['id'] in MANUAL_IMPRINT:
        city, pub, year = MANUAL_IMPRINT[o['id']]
    city = {'СПб.': 'Санкт-Петербург', 'М.': 'Москва'}.get(city, city)
    if pub and ', ' in pub and ':' in pub:   # 'Эксмо, СПб.: Comix-ART'
        pub = re.sub(r',\s*(?:СПб|М)\.:\s*', ', ', pub)
    authors = []
    for nm in [x.strip() for x in au_str.split(',') if x.strip()]:
        if not CYR.search(nm):
            continue   # студия «Gonzo» и т. п.
        authors.append(get_author(nm, japanese=True))
    contents = []
    if not comic:
        for line in o.get('full') or []:
            w = parse_content_line(line, authors)
            if w:
                contents.append(w)
    trs = [ryab]
    for line in (o.get('full') or []) + (o.get('contents') or '').split(' ¶ '):
        mtr = re.search(r'перевод\s+([^()]+?)(?:,\s*иллюстрации[^()]*)?\)', line)
        if mtr:
            trs += parse_tr_list(mtr.group(1))
    if title.isupper():
        title = title.capitalize()
    if comic:
        genre = 'манга'
    else:
        genre = genre_from_contents(contents, 'роман')
        if 'антология' in head and genre != 'манга':
            genre = 'сказки' if 'Детская' in title else genre
    b = {'id': f"r{o['id']}", 'title_ru': title, 'authors': authors, 'translators': trs, 'year': year, 'city': city, 'publisher': pub,
         'pages': o.get('pages'), 'isbn': (o.get('isbn') or '').split(',')[0].strip() or None,
         'print_run': int(re.sub(r'\D', '', o['run'])) if o.get('run') and re.search(r'\d', o['run']) else None,
         'cover': f"https://fantlab.ru/images/editions/big/{o['id']}" if o.get('img') else None,
         'source': f"https://fantlab.ru/edition{o['id']}", 'genre': genre, 'sources': ['fantlab']}
    if o.get('desc'):
        b['work_note'] = re.sub(r'\s*Содержание:\s*$', '', o['desc']).strip() or None
    sr = series_ref(o.get('series'))
    if sr:
        b['series'] = sr
    if len(contents) > 1:
        b['contents'] = contents
        if len({c.get('a') for c in contents if c.get('a')}) > 3:
            b['tags'] = ['антология']
    add_book(b)

# ---------- 3. Polyandria NoAge
P = json.load(open(os.path.join(HERE, 'inbox', 'polyandria.json'), encoding='utf-8'))
for i, o in enumerate(P):
    au = get_author(o['Автор(ы)'], japanese=True)
    if o['slug'] == 'memuary-belogo-medvedya':
        note = 'Роман написан по-немецки. ' + o['desc']
    else:
        note = o['desc']
    b = {'id': f'p{i + 1}', 'title_ru': o['title'], 'authors': [au], 'translators': parse_tr_list(o.get('Перевод'), order='western'),
         'year': int(o['Год издания']), 'city': 'Санкт-Петербург', 'publisher': 'Поляндрия NoAge',
         'pages': int(o['Объём, стр.']) if o.get('Объём, стр.', '').isdigit() else None, 'isbn': o.get('ISBN'),
         'print_run': int(re.sub(r'\D', '', o['Суммарный тираж'])) if o.get('Суммарный тираж') else None,
         'cover': o.get('img'), 'source': o['url'], 'genre': 'роман', 'work_note': note, 'sources': ['polyandria']}
    if o.get('preorder'):
        b['work_note'] = 'Готовится к выходу (предзаказ на сайте издательства). ' + (b['work_note'] or '')
    if o['slug'] in ('lyudi-tut-u-nas', 'spokoynoy-nochi-tokio', 'brak-s-nbsp-drugimi-vidami'):
        b['genre'] = 'новеллы'
    if o['slug'] in ('vekovaya-gryaz', 'nora'):
        b['genre'] = 'повесть'
    add_book(b)

# ---------- 4. Labirint: Orientalia et Classica about Japan
L = json.load(open(os.path.join(HERE, 'inbox', 'labirint.json'), encoding='utf-8'))
for o in L:
    title = re.sub(r':\s*[^:]+$', '', o['title']) if o.get('authors') else o['title']
    authors = []
    if o.get('authors') and o['id'] not in (652594, 626401):   # у сборников «История и культура…» — составители, а не авторы
        for nm in re.sub(r'\+ еще \d+', '', o['authors']).split(','):
            if nm.strip():
                authors.append(get_author(nm.strip(), order='eastern', japanese=False))
    pub, year = (o.get('pub') or ',').split(',')
    b = {'id': f"l{o['id']}", 'title_ru': title.strip(), 'authors': authors, 'year': int(year) if year.strip().isdigit() else None,
         'city': 'Москва', 'publisher': pub.strip() or 'РГГУ', 'pages': int(o['pages']) if o.get('pages') else None, 'isbn': o.get('isbn'),
         'cover': o.get('img'), 'source': o['url'], 'genre': 'исследование', 'series': series_ref('Orientalia et classica'),
         'sources': ['labirint']}
    if o.get('editors'):
        b['work_note'] = 'Отв. ред.: ' + re.sub(r'Художник.*$', '', o['editors']).strip() + '.'
    add_book(b)

# ---------- 5. V. V. Shchepkin (HSE profile)
SH = [
    (['Хомченкова Вера', 'Щепкин Василий', 'Трубникова Надежда'], 'Расставаясь с жизнью: предания о верных вассалах из Ако в иллюстрациях Итиюсая Куниёси', 'Санкт-Петербург', 'Галерея KASUGAI', 2025, 'искусство', None),
    ([], 'История и культура Японии. Выпуск 16', 'Москва', 'Издательский дом ВШЭ', 2024, 'исследование', 'Сборник статей; среди авторов — В. В. Щепкин, А. Н. Мещеряков, Е. М. Дьяконова, М. В. Торопыгина и другие.'),
    (['Щепкин Василий'], 'Айны глазами японцев: неизвестная коллекция А. В. Григорьева', 'Санкт-Петербург', 'Арка', 2022, 'история', None),
    (['Щепкин Василий', 'Гришачев Сергей', 'Соколов Андрей', 'Климов Вадим', 'Осипова Мария'], 'Четыре века экспедиций в земли айнов', 'Санкт-Петербург', 'Арт-Экспресс', 2022, 'история', 'Науч. ред. В. В. Щепкин.'),
    (['Горбунов Сергей', 'Зайцев Ярослав', 'Соколов Андрей', 'Климова Ольга', 'Осипова Мария', 'Щепкин Василий'], 'Новые источники по истории и культуре айнов', 'Санкт-Петербург', 'Лема', 2021, 'история', 'Под общ. ред. В. В. Щепкина.'),
    (['Климов Вадим', 'Осипова Мария', 'Щепкин Василий', 'Климова Ольга'], 'Айны в истории российско-японских отношений XVIII–XIX вв.', 'Санкт-Петербург', 'Лема', 2020, 'история', 'Под общ. ред. В. В. Щепкина.'),
    (['Щепкин Василий'], 'Северный ветер: Россия и айны в Японии XVIII в.', 'Москва', 'Кругъ', 2017, 'история', 'Серия «Новые исследования по японской культуре», кн. 4. Отв. ред. В. Э. Молодяков.'),
]
for i, (au, title, city, pub, year, genre, note) in enumerate(SH):
    b = {'id': f'h{i + 1}', 'title_ru': title, 'authors': [get_author(a, order='eastern', japanese=False) for a in au], 'year': year,
         'city': city, 'publisher': pub, 'pages': None, 'genre': genre, 'work_note': note, 'source': 'https://www.hse.ru/org/persons/190995505/#sci',
         'sources': ['hse']}
    dup = next((x for x in books if fold(x['title_ru']) == fold(title) and x['year'] == year), None)
    if not dup:
        add_book(b)

# ---------- 6. E. S. Steiner (Wikipedia)
steiner = get_author('Штейнер Евгений Семёнович', order='eastern', japanese=False)
hokusai = get_author('Кацусика Хокусай', kanji='葛飾北斎', order='eastern', japanese=True)
sekien = get_author('Торияма Сэкиэн', kanji='鳥山石燕', order='eastern', japanese=True)
steiner_tr = get_translator(name='Штейнер Евгений', order='eastern')
ST = [
    ([steiner], [], 'Иккю Содзюн: творческая личность в контексте средневековой культуры', 'Москва', 'Наука', 1987, 277, 'исследование', None),
    ([steiner], [], 'Русско-японско-английский разговорник и словарь', 'Москва', 'Радуга', 2003, 272, 'учебник', None),
    ([steiner], [], 'Без Фудзиямы: японские образы и воображения', 'Москва', 'Наталис', 2005, 400, 'очерки', None),
    ([steiner], [], 'Дзэн-жизнь: Иккю и окрестности', 'Санкт-Петербург', 'Петербургское востоковедение', 2006, 306, 'исследование', None),
    ([steiner], [], 'Приближение к Фудзияме', 'Москва', 'Слово', 2011, 352, 'очерки', None),
    ([steiner], [], 'Япония. Приближение к Фудзияме', None, None, 2024, 400, 'очерки', 'Переиздание книги 2011 года с изменениями.'),
    ([hokusai, steiner], [steiner_tr], 'Манга Хокусая: энциклопедия старой японской жизни в картинках', 'Санкт-Петербург', 'Петербургское востоковедение', 2016, 218, 'искусство', 'В четырёх томах: т. 1 — исследование, перевод, комментарии (218 с.); т. 2–4 — полное воспроизведение 15 альбомов «Манга Хокусая». Премии «Книга года» (2017) и «Просветитель» (2017, спецноминация).'),
    ([steiner], [], 'Япония в России: коллекционирование японского искусства в России в конце XIX — начале XX вв. и последующая судьба этих собраний', 'Москва', 'Первый Том', 2019, 300, 'искусство', 'Науч. ред., автор предисловия и статьи — Е. С. Штейнер.'),
    ([steiner], [], 'Картины сердца: идеи и образы старой Японии', 'Санкт-Петербург', 'Петербургское востоковедение', 2021, 597, 'исследование', None),
    ([hokusai, steiner], [steiner_tr], 'Манга Хокусая. Том 1: Боги и люди', 'Москва', 'АСТ', 2022, 320, 'искусство', None),
    ([steiner], [], 'В пучине бренного мира: японское искусство и его коллекционер Сергей Китаев', 'Москва', 'Новое литературное обозрение', 2022, 340, 'искусство', None),
    ([hokusai, steiner], [steiner_tr], 'Манга Хокусая. Том 2: Природа', 'Москва', 'АСТ', 2023, 256, 'искусство', None),
    ([sekien, steiner], [steiner_tr], 'Ёкаи: сверхъестественные существа в японской культуре', 'Москва', 'АСТ', 2025, 320, 'справочник', 'Введение, полная публикация, перевод и комментарии энциклопедии Ториямы Сэкиэна «Ночные выходки сонма бесов».'),
]
for i, (au, tr, title, city, pub, year, pages, genre, note) in enumerate(ST):
    add_book({'id': f'st{i + 1}', 'title_ru': title, 'authors': au, 'translators': tr, 'year': year, 'city': city, 'publisher': pub,
              'pages': pages, 'genre': genre, 'work_note': note, 'sources': ['wikipedia'],
              'source': 'https://ru.wikipedia.org/wiki/Штейнер,_Евгений_Семёнович'})

# ---------------------------------------------------------------- works (Fantlab search + works-only rows)
W = json.load(open(os.path.join(HERE, 'works.json'), encoding='utf-8'))
works = []
for w in W:
    if not w['title_ru']:
        continue
    aids = []
    for a in w['authors']:
        for chunk in re.split(r',\s*(?![^()]*\))', a['name']):
            nm, kanji, lat = strip_paren(chunk)
            if not nm or not CYR.search(nm) or 'Стругацк' in nm or nm in ('Уильям Гибсон', 'Том Мэддокс', 'Юрий Нагибин'):
                continue
            aids.append(get_author(nm, kanji=kanji, japanese=True))
    works.append({'id': f"w{w['fl_work']}", 'authors': list(dict.fromkeys(aids)), 'title_ru': w['title_ru'], 'title_orig': w['title_orig'],
                  'title_romaji': w['title_romaji'], 'kind': (w['kind'] or '').lower() or None, 'fantlab': w['fl_work']})
for i, w in enumerate(extra_works):
    works.append({'id': f'xw{i + 1}', 'authors': w['authors'], 'title_ru': w['title_ru'], 'title_orig': w['title_orig'], 'title_romaji': None,
                  'kind': None, 'translators': w['translators']})

# ---------------------------------------------------------------- write
for p in A.people.values():
    p.pop('japanese', None)
cat['authors'] = list(A.people.values())
cat['translators'] = list(T.people.values())
cat['books'] = cat['books'] + books
cat['works'] = works
cat['series'] = list(series_by_name.values())
cat['_note'] = ('Книги b1–b13 (кроме «Ветки сакуры») — демонстрационные данные. Остальное внесено 8 ноября 2026 г. из таблицы пользователя, '
                'Фантлаба (серия «Библиотека японской литературы», переводы Е. А. Рябовой, поиск произведений по стране «Япония»), '
                'каталога «Поляндрии NoAge», «Лабиринта» (серия Orientalia et Classica), профиля В. В. Щепкина на сайте ВШЭ и статьи '
                'о Е. С. Штейнере в Википедии.')
json.dump(cat, open(out_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
if lookup_out:
    json.dump(sorted({c for cs in lookups.values() for c in cs}), open(lookup_out, 'w', encoding='utf-8'), ensure_ascii=False)
print('books', len(cat['books']), '(new', len(books), ') works', len(works), 'authors', len(cat['authors']), 'translators', len(cat['translators']),
      'series', len(cat['series']), 'lookups', len(lookups))
print('skipped:', skipped)
