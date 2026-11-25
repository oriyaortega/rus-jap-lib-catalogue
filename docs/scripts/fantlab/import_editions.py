# Добавляет в каталог книги — издания с Фантлаба, в которых выходили произведения каталога, но которых в каталоге нет
# (список «Публикации на русском» на страницах произведений).
# Вход: карточки изданий (fetch_editions.py), карточки произведений (fetch_work_editions.py),
# карточки издательств (для города; скачиваются сюда же, в <папка изданий>/pub/).
# Отбор по критериям каталога: журналы не входят (их нет во входных данных); сборник входит, если не меньше половины
# его основных произведений — из таблицы произведений каталога, или если все его авторы — авторы этих произведений.
# Сборники, лишь частично связанные с Японией (зарубежная фантастика с одним японским рассказом), пропускаются.
# Книги получают id fe<номер издания на Фантлабе> и добавляются в конец массива books (номера карточек не сдвигаются).
# Запуск: python import_editions.py data/catalog.json data/work-editions.json <папка произведений> <папка изданий> <отчёт.json>
import json, os, re, sys, time, urllib.request
from collections import Counter

cat_path, we_path, wdir, edir, report_path = sys.argv[1:6]
TODAY = '2026-11-25'
cat = json.load(open(cat_path, encoding='utf-8'))
we = json.load(open(we_path, encoding='utf-8'))
H = {'User-Agent': 'jlit-catalog/0.1'}

def untag(s):
    s = re.sub(r'\[(pub|art|URL|url|work|autor|series)=[^\]]*\]', '', s or '')
    s = re.sub(r'\[/?[a-zA-Z]+\]', '', s)
    return re.sub(r'<[^>]+>', '', s).strip()
def norm(s):
    return re.sub(r'[^\w]+', ' ', (s or '').lower().replace('ё', 'е')).strip()

# ---------- произведения каталога по номеру Фантлаба
work_by_fl = {w['fantlab']: w for w in cat['works'] if w.get('fantlab')}

# ---------- авторы: номер автора на Фантлабе → id автора каталога (по карточкам произведений)
author_by_fl = {}
for w in cat['works']:
    p = os.path.join(wdir, f"{w.get('fantlab')}.json")
    if not w.get('fantlab') or not os.path.exists(p): continue
    d = json.load(open(p, encoding='utf-8'))
    fa = [a for a in d.get('authors') or [] if a.get('type') == 'autor']
    if len(fa) == len(w['authors']):
        for a, aid in zip(fa, w['authors']): author_by_fl.setdefault(str(a['id']), aid)

# японские авторы каталога (имя в оригинале иероглифами или каной) — по набору слов имени, в любом порядке
CJK = re.compile(r'[぀-ヿ㐀-鿿]')
def name_key(s): return frozenset(norm(s).replace('й', 'и').split())
jp_names = {name_key(a['name_ru']) for a in cat['authors'] if CJK.search(a.get('name_orig') or '')}
# японское имя в поливановской записи: каждое слово складывается из японских слогов (Мацуо Басё, Эдогава Рампо)
JP_WORD = re.compile(r'^(?:(?:кк|тт|пп|сс|тц|мм)?(?:дз|[кгсзтдцнхфбпмрвч])?[аиуэеояюё][йн]?|н|м(?=[пб])|с(?=к))+$')
def jp_phonetic(s):
    words = [w for w in re.split(r'[\s\-]+', (s or '').lower()) if w and not re.fullmatch(r'\w\.', w)]
    return bool(words) and all(len(w) >= 2 and JP_WORD.match(w) for w in words)
def is_jp_name(s): return bool(s) and (name_key(s) in jp_names or jp_phonetic(s))
author_by_name = {}
for a in cat['authors']: author_by_name.setdefault(name_key(a['name_ru']), a['id'])

# ---------- переводчики: по фамилии и первой букве имени
def tr_key(surname, first): return (surname.lower().replace('ё', 'е'), (first or '?')[0].lower())
tr_by_key = {}
for t in cat['translators']:
    rest = t['name_ru'].replace(t['sort'], '').split()
    tr_by_key.setdefault(tr_key(t['sort'], rest[0] if rest else ''), t['id'])
    for part in t['sort'].split('-'): tr_by_key.setdefault(tr_key(part, rest[0] if rest else ''), t['id'])
TRANSLIT = dict(zip('абвгдеёжзийклмнопрстуфхцчшщъыьэюя', ['a','b','v','g','d','e','e','zh','z','i','y','k','l','m','n','o','p','r','s','t','u','f','kh','ts','ch','sh','shch','','y','','e','yu','ya']))
def translit(s): return ''.join(TRANSLIT.get(c, c if c.isascii() and c.isalnum() else '') for c in s.lower())
ids_taken = {t['id'] for t in cat['translators']} | {a['id'] for a in cat['authors']}
new_translators = []
def translator_id(name):
    """«Вера Маркова» → id переводчика каталога; нового переводчика добавляет."""
    parts = name.split()
    if not parts: return None
    surname, first = parts[-1], (parts[0] if len(parts) > 1 else '')
    k = tr_key(surname, first)
    if k in tr_by_key: return tr_by_key[k]
    base = translit(surname) or 'tr'
    tid = base if base not in ids_taken else base + translit(first)[:4]
    n = 2
    while tid in ids_taken: tid = f'{base}{n}'; n += 1
    ids_taken.add(tid)
    t = {'id': tid, 'wikidata': None, 'name_ru': f'{surname} {" ".join(parts[:-1])}'.strip(),
         'short': f'{first[0]}. {surname}' if first else surname, 'sort': surname}
    if re.search(r'[A-Za-z]', name):  # группа переводчиков («гр. Devoted-Otaku»)
        g = re.sub(r'^гр\.\s*', '', name).strip()
        t.update(name_ru=g, short=g, sort=g)
    cat['translators'].append(t); new_translators.append(t); tr_by_key[k] = tid
    return tid

# ---------- серии
series_by_name = {norm(s['name']): s['id'] for s in cat['series']}
new_series = []
def series_id(s):
    k = norm(s['name'])
    if k in series_by_name: return series_by_name[k]
    sid = f"fls{s['id']}" if s.get('id') else 'fls-' + translit(s['name'])[:30]
    rec = {'id': sid, 'name': s['name']}
    if s.get('id'): rec['source'] = f"https://fantlab.ru/series{s['id']}"
    cat['series'].append(rec)
    new_series.append(sid); series_by_name[k] = sid
    return sid

# ---------- издательства: город
pub_dir = os.path.join(edir, 'pub'); os.makedirs(pub_dir, exist_ok=True)
def publisher_city(pid):
    p = os.path.join(pub_dir, f'{pid}.json')
    if not os.path.exists(p):
        try:
            data = urllib.request.urlopen(urllib.request.Request(f'https://api.fantlab.ru/publisher/{pid}', headers=H), timeout=30).read()
            json.loads(data); open(p, 'wb').write(data); time.sleep(0.4)
        except Exception as e:
            print('publisher', pid, 'ERR', e); return None
    d = json.load(open(p, encoding='utf-8'))
    return (d.get('city') or '').strip() or None

# ---------- содержание издания
LINK = re.compile(r'<a href="/work(\d+)">([^<]*)</a>')
PAGES = re.compile(r'(?:стр|с|c)\.\s*([\d\-–, ]*\d)\s*$')
# «Автор. Название (вид, перевод …), стр. 5-10»: автор отделяется последней точкой после слова (не инициала) перед названием
AUTHOR_SPLIT = re.compile(r'^(.*?[^\W\d_]{2,}[»"]?)\.\s+(?=\S)')
AUX = {'статья', 'интервью', 'предисловие', 'послесловие', 'комментарии', 'примечания', 'очерк', 'документальное произведение', 'рецензия', 'библиография', 'словарь', 'справочник'}
SERVICE = re.compile(r'(примечани|комментари|предислови|послеслови|от переводчика|от составител|вступлени|об авторе|словарь|указател|содержание|библиограф)')
def parse_item(line):
    line = re.sub(r'^(\s*)-\s*', lambda m: m[1], line)  # «-Юдзан Дайдодзи. …» — дефис в начале строки
    depth = len(line) - len(line.lstrip())
    s = line.strip()
    pm = PAGES.search(s)
    pages = pm[1].replace('-', '–').strip() if pm else ''
    if pm: s = s[:pm.start()].rstrip(' ,')
    lm = LINK.search(s)
    if lm:
        author = untag(s[:lm.start()]).strip().rstrip('.').strip()
        wid, title, rest = int(lm[1]), untag(lm[2]), s[lm.end():]
    else:
        wid = None
        body = re.split(r'\s\(', s, maxsplit=1)
        am = AUTHOR_SPLIT.match(body[0])
        # автор — короткое имя (до 4 слов), иначе это часть названия («Книга первая. Разные песни»)
        author = am[1] if am and len(am[1].split()) <= 4 else ''
        title = untag(body[0][len(am[0]):] if author else body[0])
        rest = '(' + body[1] if len(body) > 1 else ''
    im = re.match(r'\s*\(([^)]*)\)', rest)
    info = im[1].split(',') if im else []
    kind = info[0].strip() if info and not info[0].strip().startswith('перевод') else ''
    return {'author': untag(author), 'wid': wid, 'title': title.strip(' .'), 'kind': kind, 'pages': pages, 'depth': depth,
            # заголовок раздела («БАСЁ», «КНИГА ПЕРВАЯ») — без ссылки, автора, вида и страниц
            'header': not (wid or author or kind or pages) or s.endswith(':')}

GENRE = {'роман': 'роман', 'роман-эпопея': 'роман', 'повесть': 'повесть', 'рассказ': 'новеллы', 'микрорассказ': 'новеллы', 'новелла': 'новеллы',
         'манга': 'манга', 'комикс': 'манга', 'графический роман': 'манга', 'пьеса': 'драма', 'киносценарий': 'драма',
         'стихотворение': 'поэзия', 'стихи': 'поэзия', 'стихотворения': 'поэзия', 'поэма': 'поэзия', 'сказка': 'сказки', 'сказки': 'сказки',
         'эссе': 'очерки', 'документальное произведение': 'очерки', 'очерк': 'очерки'}

# названия переводных японских книг каталога («Манъёсю»): издание с таким названием — японское
GENERIC = re.compile(r'^(избранное|избранные|сочинения|собрание|рассказы|повести|стихотворения|стихи|сказки|том|книга|антология|сборник)')
jp_titles = {t for b in cat['books'] if 'переводная' in b['tags'] and CJK.search(b.get('title_orig') or '')
             for t in [norm(b['title_ru'].split('.')[0])] if len(t) >= 5 and not GENERIC.match(t)}

# ---------- уже имеющиеся книги: для проверки повторов
def isbns(s): return {re.sub(r'[^0-9x]', '', p.lower()) for p in re.split(r'[,;]', s or '') if len(re.sub(r'[^0-9x]', '', p.lower())) >= 10}
have_isbn = {i for b in cat['books'] for i in isbns(b.get('isbn'))}
have_key = {(norm(b['title_ru']), b.get('year'), norm(b.get('publisher'))) for b in cat['books']}

# ---------- публикации каждого издания: какие произведения каталога и переводчики (из work-editions.json)
pubs_of = {}
for wid, info in we.items():
    for p in info['pubs']:
        if not p.get('book') and p['kind'] == 'книга': pubs_of.setdefault(p['fl'], []).append((wid, p))
work_by_id = {w['id']: w for w in cat['works']}

added, skipped = [], []
for fl in sorted(pubs_of):
    path = os.path.join(edir, f'{fl}.json')
    if not os.path.exists(path): skipped.append((fl, 'нет карточки')); continue
    d = json.load(open(path, encoding='utf-8'))
    title = untag(d.get('edition_name'))
    if d.get('lang_code') not in (None, '', 'ru'): skipped.append((fl, f'язык {d.get("lang")}', title)); continue
    isbn = ', '.join(i for i in d.get('isbns') or [] if re.search(r'\d', i))
    if isbns(isbn) & have_isbn: skipped.append((fl, 'уже есть (ISBN)', title)); continue
    publishers = [untag(p['name']) for p in (d.get('creators') or {}).get('publishers') or []]
    publisher = ', '.join(publishers) or None
    if (norm(title), d.get('year'), norm(publisher)) in have_key: skipped.append((fl, 'уже есть (название, год, издательство)', title)); continue

    items, heads = [], {}
    for x in (parse_item(l) for l in d.get('content') or []):
        if not x or not x['title']: continue
        if x['header']: heads[x['depth']] = x['title']; continue
        # без имени автора — автор из заголовка раздела выше («БАСЁ»), если это японское имя
        if not x['author']:
            h = next((heads[k] for k in sorted(heads, reverse=True) if k < x['depth']), '')
            if is_jp_name(h.title()): x['jp_head'] = True
        items.append(x)
    useful = [x for x in items if x['kind'] not in AUX and not SERVICE.match(x['title'].lower())]
    # основные произведения — верхнего уровня среди не служебных (без предисловий, статей и т. п.)
    top = min((x['depth'] for x in useful), default=0)
    main = [x for x in useful if x['depth'] == top]
    # «своё» произведение — из таблицы произведений каталога или японского автора; доля считается по всем уровням
    ours = [x for x in useful if x['wid'] in work_by_fl or is_jp_name(x['author']) or x.get('jp_head')]
    main_n, ours_n = len(useful), len(ours)
    if 'басё' in title.lower() or is_jp_name(title.split('.')[0]): ours_n = main_n
    ed_authors = [a for a in (d.get('creators') or {}).get('authors') or []]
    authors_ours = bool(ed_authors) and all(str(a.get('id')) in author_by_fl or is_jp_name(a.get('name')) for a in ed_authors)
    # авторская книга, в карточке которой нет содержания: само издание — одно произведение каталога
    single = not main and len(pubs_of[fl]) >= 1
    share = ours_n / main_n if main_n else 1.0
    # издание целиком — произведение каталога («Манъёсю»)
    whole = d.get('edition_work_id') in work_by_fl or norm(title.split('.')[0]) in jp_titles
    if not (single or whole or share >= 0.5 or authors_ours or 'япон' in title.lower()):
        skipped.append((fl, f'сборник лишь частично о Японии ({ours_n} из {main_n})', title)); continue

    # переводчики произведений этого издания
    tr_of_work = {}
    for wid, p in pubs_of[fl]:
        tr_of_work[work_by_id[wid]['fantlab']] = [t for t in (translator_id(n) for n in p.get('tr') or []) if t]
    authors = []
    for a in ed_authors:
        aid = author_by_fl.get(str(a.get('id'))) or author_by_name.get(name_key(a.get('name')))
        if aid and aid not in authors: authors.append(aid)
    if not ed_authors:  # антология: авторы — только если у всех произведений один автор
        al = {a for wid, _ in pubs_of[fl] for a in work_by_id[wid]['authors']}
        if len(al) == 1 and len(ours) == len(main): authors = list(al)
    if not authors and author_by_name.get(name_key(title.split('.')[0])):  # «Мацуо Басё. Великое в малом»
        authors = [author_by_name[name_key(title.split('.')[0])]]
    if not authors and d.get('edition_work_id') in work_by_fl: authors = list(work_by_fl[d['edition_work_id']]['authors'])
    if not authors and single:
        authors = list(dict.fromkeys(a for wid, _ in pubs_of[fl] for a in work_by_id[wid]['authors']))
    translators = list(dict.fromkeys(t for l in tr_of_work.values() for t in l))

    contents = []
    if len(main) > 1:
        for x in items:
            if x not in main and not (x['kind'] in AUX and x['depth'] <= top): continue
            w = work_by_fl.get(x['wid'])
            a = (w['authors'][0] if w['authors'] else None) if w else author_by_name.get(name_key(x['author'])) if x['author'] else None
            item = {'a': a, 't': x['title'], 'k': x['kind'] or None, 'tr': tr_of_work.get(x['wid'], []), 'p': x['pages'] or None}
            if not a and x['author']: item['at'] = x['author']
            contents.append(item)

    # жанр — по видам произведений каталога в издании, иначе по содержанию
    # (если в содержании есть произведения каталога — только по ним: предисловие другого автора не в счёт)
    basis = [x for x in main if x['wid'] in work_by_fl] or main
    kinds = Counter(GENRE.get((work_by_fl[x['wid']].get('kind') if x['wid'] in work_by_fl else x['kind']) or '', '') for x in basis) if len(main) > 1 else Counter()
    kinds.pop('', None)
    if not kinds:
        kinds = Counter(GENRE.get(work_by_id[wid].get('kind') or '', '') for wid, _ in pubs_of[fl]); kinds.pop('', None)
    genre = kinds.most_common(1)[0][0] if kinds else 'новеллы'
    w1 = work_by_id[pubs_of[fl][0][0]] if len(pubs_of[fl]) == 1 and len(main) <= 1 else None
    tags = ['художественная', 'переводная', genre]
    if genre == 'манга': tags.append('манга')
    if d.get('edition_type') == 'антология': tags.append('антология')
    city = None
    for p in (d.get('creators') or {}).get('publishers') or []:
        if p.get('id'): city = city or publisher_city(p['id'])
    img = (d.get('image') or '').split('?')[0]
    b = {
        'id': f'fe{fl}', 'authors': authors, 'genre': genre, 'orig_year': (w1 or {}).get('year'), 'added': TODAY,
        'title_ru': title, 'title_orig': (w1 or {}).get('title_orig'), 'title_romaji': (w1 or {}).get('title_romaji'),
        'translators': translators, 'year': d.get('year') or None, 'city': city, 'publisher': publisher, 'pages': d.get('pages') or None,
        'tags': list(dict.fromkeys(tags)), 'sources': ['fantlab'], 'source': f'https://fantlab.ru/edition{fl}',
    }
    if isbn: b['isbn'] = isbn
    if d.get('copies'): b['print_run'] = d['copies']
    if img: b['cover'] = b['cover_src'] = f'https://fantlab.ru{img}'
    if d.get('series'): b['series'] = {'id': series_id(d['series'][0])}
    # содержание из сотен стихотворений (антологии хайку) не выводим: оно есть на Фантлабе
    if contents and len(contents) <= 120: b['contents'] = contents
    cat['books'].append(b); added.append(b)
    have_key.add((norm(title), d.get('year'), norm(publisher))); have_isbn |= isbns(isbn)

cat['news'].insert(0, {'date': TODAY, 'text': f'По данным Фантлаба добавлены {len(added)} изданий, в которых выходили произведения каталога: '
                       'теперь они есть и в списке «Публикации на русском» на страницах произведений, и среди изданий каталога.'})
json.dump(cat, open(cat_path, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=1)
json.dump({'added': [b['id'] for b in added], 'skipped': skipped, 'new_translators': new_translators, 'new_series': new_series},
          open(report_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('added', len(added), 'skipped', len(skipped), Counter(s[1].split(' (')[0] for s in skipped), 'new translators', len(new_translators), 'new series', len(new_series))
