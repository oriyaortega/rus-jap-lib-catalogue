"""Build IV RAN (book.ivran.ru) additions: ivb_extra_books.json, ivb_people.json, ivb_enrich.json
Usage: python ivb_build.py <catalog.json>"""
import json, re, sys, hashlib, collections

b = json.load(open('ivb_books.json', encoding='utf-8'))
s = json.load(open('ivb_sel.json'))
cat = json.load(open(sys.argv[1], encoding='utf-8'))

# Already in the catalog: only fill in missing fields
DUP = {310: 'hy472923', 332: 'ms24', 585: 'x54', 1137: 'hy433088', 1366: 'b12', 1375: 'x9', 1376: 'x8',
       1377: 'x7', 5089: 'ms35', 5270: 'ms36', 1367: 'x136', 1370: 'x71', 5259: 'hy749078'}
SEL = [i for i in s['sel'] if i not in DUP] + [965, 1364, 1368, 1373, 818, 5517, 5486]
# Literary books (translations of Japanese literature, A. Dolin's own poems)
LIT = {968: 'поэзия', 1124: 'роман', 1139: 'поэзия', 1140: 'поэзия', 1141: 'поэзия', 1142: 'поэзия', 1143: 'поэзия',
       1144: 'поэзия', 1147: 'поэзия', 1148: 'поэзия', 1149: 'поэзия', 5487: 'поэзия', 5612: 'очерки',
       5729: 'моногатари', 1136: 'поэзия'}
EXTRA_AUTH = {1143: ['Масаока Сики'], 1144: ['Танэда Сантока']}


def k2(n):
    w = n.replace('ё', 'е').split()
    return ' '.join(w[:2]).lower()


A = {k2(a['name_ru']): a['id'] for a in cat['authors']}
T = {k2(t['name_ru']): t['id'] for t in cat['translators']}
new_auth, new_tr = {}, {}


def pid(prefix, n):
    return prefix + hashlib.md5(n.encode()).hexdigest()[:8]


def short2(full):
    w = full.split()
    return ' '.join(x[0] + '.' for x in w[1:3]) + (' ' if len(w) > 1 else '') + w[0]


def author_id(full):
    k = k2(full)
    if k in A:
        return A[k]
    i = pid('iva', k)
    if i not in new_auth:
        w = full.split()
        new_auth[i] = {'wikidata': None, 'name_ru': ' '.join(w[:2]), 'name_orig': None, 'sort': w[0], 'id': i}
        if len(w) > 2:
            new_auth[i]['full_name'] = full
    return i


def tr_id(full):
    k = k2(full)
    if k in T:
        return T[k]
    i = pid('ivt', k)
    if i not in new_tr:
        w = full.split()
        new_tr[i] = {'wikidata': None, 'name_ru': ' '.join(w[:2]), 'short': (w[1][0] + '. ' if len(w) > 1 else '') + w[0],
                     'sort': w[0], 'id': i}
    return i


PUBN = {'АИРО–ХХI': 'АИРО-XXI', 'АИРО-XX': 'АИРО-XXI', '«AIRO–ХХI»': 'АИРО-XXI', 'ГРВЛ': 'Наука',
        '«Наука» Главная редакция восточной литературы': 'Наука', 'Наука. Главная редакция восточной литературы': 'Наука'}


def genre_of(t):
    tl = t.lower()
    if re.search(r'ежегодник|библиограф|указател|review', tl):
        return 'справочник'
    if re.search(r'учеб', tl):
        return 'учебник'
    if re.search(r'искусств|театр|кино|эстетик|гравюр', tl):
        return 'искусство'
    if re.search(r'истори|эпох|век|войн|ронин|1\d\d\d|токугава|мэйдзи|средневек|древн|законы|законодат|уложени|синтё|плен', tl):
        return 'история'
    if re.search(r'очерк|размышлен|портрет|путь сердца|альбом|секреты|праздник|мацури|этикет|воспитание|долголетие|путеводитель', tl):
        return 'очерки'
    return 'исследование'


def topics(t):
    tl = t.lower()
    r = []
    if re.search(r'полити|дипломат|отношени|парти|парламент|конституц|бюрократ|либерал|консерват|разведк|союз|пацифизм|мировой порядок|правящие|демократ|внешн', tl):
        r.append('политика')
    if re.search(r'эконом|промышлен|рын|корпорац|монопол|капитал|финанс|кредит|сельск|аграр|транспорт|железн|бизнес|предприн|торгов|мицубиси|сумитомо|труд|производств|кризис', tl):
        r.append('экономика')
    if re.search(r'бизнес|предприн|торговать|корпорац', tl):
        r.append('бизнес')
    return r


SHORT = {'Главный редактор': 'Гл. ред.', 'Ответственный редактор': 'Отв. ред.', 'Редактор': 'Ред.',
         'Руководитель проекта': 'Рук. проекта', 'Составитель': 'Сост.', 'Редактор-составитель': 'Ред.-сост.',
         'Редакционная коллегия': 'Редкол.'}


def clean_ann(a):
    a = re.sub(r'^Москва[^.]*?\d{4}, \d+ стр\. ', '', a or '').strip()
    return a or None


def norm_isbn(v):
    return v.replace('ISBN', '').replace('–', '-').replace('Х', 'X').strip() if v else None


books, enrich = [], {}
for i in SEL:
    x = b[str(i)]
    t = re.sub(r'\s+:', ':', x['title'].strip()).rstrip('.').strip()
    if t.isupper():
        t = t.capitalize()
    lit = i in LIT
    tr, notes = [], []
    for role, names in x['roles']:
        if re.search(r'перев', role, re.I):
            tr += [tr_id(n) for n in names]
        else:
            notes.append(f"{SHORT.get(role, role)} {', '.join(short2(n) for n in names)}.")
    au = x['authors']
    if len(au) > 4:
        notes.insert(0, 'Авторы: ' + ', '.join(short2(n) for n in au) + '.')
        au = []
    aids = [author_id(n) for n in EXTRA_AUTH.get(i, [])] + [author_id(n) for n in au]
    g = LIT.get(i) or genre_of(t)
    if lit:
        tags = ['художественная', 'на русском' if i == 1136 else 'переводная', g]
    else:
        tags = ['нехудожественная', 'переводная' if tr else 'на русском', g] + topics(t)
    note = ' '.join(notes + [clean_ann(x['ann']) or '']).strip() or None
    pubs = [PUBN.get(p, p) for p in x['pubs']]
    bk = {'id': f'iv{i}', 'title_ru': t, 'authors': list(dict.fromkeys(aids)), 'year': x['year'], 'city': x['city'],
          'publisher': ', '.join(dict.fromkeys(pubs)) or None, 'pages': x['pages'], 'genre': g, 'work_note': note,
          'cover': x['cover'], 'source': f'https://book.ivran.ru/book?id={i}', 'sources': ['ivran'], 'added': '2026-11-08',
          'translators': list(dict.fromkeys(tr)), 'tags': list(dict.fromkeys(tags)), 'orig_year': None,
          'title_orig': None, 'title_romaji': None}
    if x['isbn']:
        bk['isbn'] = norm_isbn(x['isbn'])
    books.append(bk)

for i, cid in DUP.items():
    x = b[str(i)]
    e = {'cover': x['cover'], 'work_note': clean_ann(x['ann']), 'pages': x['pages'], 'isbn': norm_isbn(x['isbn'])}
    enrich[cid] = {k: v for k, v in e.items() if v}

json.dump(books, open('ivb_extra_books.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump({'authors': list(new_auth.values()), 'translators': list(new_tr.values())},
          open('ivb_people.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(enrich, open('ivb_enrich.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(books), 'new authors', len(new_auth), 'new tr', len(new_tr), 'enrich', len(enrich))
print(collections.Counter(x['genre'] for x in books))
print(collections.Counter(t for x in books for t in x['tags'] if t in ('политика', 'экономика', 'бизнес')))
print('matched existing authors:', sorted({a for x in books for a in x['authors'] if not a.startswith('iva')}))
print('matched existing tr:', sorted({a for x in books for a in x['translators'] if not a.startswith('ivt')}))
