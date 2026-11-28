# Произведения для художественных изданий, которые не относятся ни к одному произведению каталога (26 ноября 2026 г.).
# Запуск: python -X utf8 add_book_works.py SCRATCH [--write] из корня проекта; SCRATCH/cover.json — результат coverage_test.ts.
# Повторно не запускать: правки и ручной список M рассчитаны на каталог того дня.
import json, re, sys, collections, unicodedata
SP = sys.argv[1]
d = json.load(open(SP + '/cover.json', encoding='utf-8'))
c = json.load(open('data/catalog.json', encoding='utf-8'))
B = {b['id']: b for b in c['books']}
FIC = {'роман', 'новеллы', 'поэзия', 'повесть', 'сказки', 'моногатари', 'драма', 'дзуйхицу'}

# --- правки изданий ---
fixes = []
for b in c['books']:
    if 'miurakenta' in b['authors'] and b['genre'] != 'манга':   # «Берсерк» — манга, а не новеллы (импорт с Фантлаба)
        b['genre'] = 'манга'; b['tags'] = ['художественная', 'переводная', 'манга']; fixes.append(b['id'])
NONFIC = {'fb286540': 'очерки', 'bjc3739': 'история'}            # эссе Мураками; «Канкай ибун» — описание путешествия
for i, g in NONFIC.items():
    b = B[i]; b['genre'] = g
    b['tags'] = ['нехудожественная' if t == 'художественная' else t for t in b['tags'] if t not in FIC] + [g]
    fixes.append(i)
B['bjc3922']['title_ru'] = 'Пионовый фонарь'                      # опечатка распознавания («ПИОНОЕЫЙ»)
fixes.append('bjc3922')

covered = {x['id'] for x in d if x['works']}
unc = [b for b in c['books'] if b['genre'] in FIC and b['id'] not in covered]
unc_ids = {b['id'] for b in unc}

# --- уже существующие произведения: дописать издания ---
extend = {'w185676': ['bjc3922']}   # «Пионовый фонарь» Энтэя Санъютэя

# --- вручную: тома и разные названия одного произведения, книги из нескольких произведений ---
M = [
    dict(t='Повесть о Гэндзи', o='源氏物語', r='Genji monogatari', a=['murasaki'], k='моногатари', y=None, b=['b7', 'hy371080', 'hy371081', 'hy371082', 'hy638132']),
    dict(t='Записки у изголовья', o='枕草子', r='Makura no sōshi', a=['sei'], k='дзуйхицу', b=['b6', 'x101', 'wj582', 's3']),
    dict(t='Записки из кельи', o='方丈記', r='Hōjōki', a=['chomei'], k='дзуйхицу', y=1212, b=['s3']),
    dict(t='Записки от скуки', o='徒然草', r='Tsurezuregusa', a=['kenko'], k='дзуйхицу', b=['s3', 'bjc3737']),
    dict(t='Исэ моногатари', o='伊勢物語', r='Ise monogatari', a=[], k='моногатари', b=['x136', 'bjb5449']),
    dict(t='Кокинвакасю (Собрание старых и новых песен Японии)', o='古今和歌集', r='Kokin wakashū', a=[], k='антология', y=905, b=['iv1147', 'iv1148', 'iv1149', 'wj266', 'wj93']),
    dict(t='Синкокинсю (Новое собрание старых и новых песен Японии)', o='新古今和歌集', r='Shin kokin wakashū', a=[], k='антология', y=1205, b=['az151', 'wj92']),
    dict(t='Сто стихотворений ста поэтов (Хякунин иссю)', o='小倉百人一首', r='Hyakunin isshu', a=[], k='антология', b=['wj820', 'wj1013']),
    dict(t='Манъёсю', o='万葉集', r="Man'yōshū", a=[], k='антология', b=['x14']),
    dict(t='Дикий гусь', o='雁', r='Gan', a=['ogai'], k='повесть', y=1911, b=['s6']),
    dict(t='Танцовщица', o='舞姫', r='Maihime', a=['ogai'], k='рассказ', y=1890, b=['s6']),
    dict(t='Нарушенный завет', o='破戒', r='Hakai', a=['toson'], k='роман', y=1906, b=['s6', 'bjb5725', 'bjb5726']),
    dict(t='Кокоро', o='こゝろ', r='Kokoro', a=['soseki'], k='роман', y=1914, b=['x100', 'bjb5696']),
    dict(t='Сансиро', o='三四郎', r='Sanshirō', a=['soseki'], k='роман', y=1908, b=['hy817078']),
    dict(t='Затем', o='それから', r='Sorekara', a=['soseki'], k='роман', y=1909, b=['hy817078']),
    dict(t='Врата', o='門', r='Mon', a=['soseki'], k='роман', y=1910, b=['hy817078']),
    dict(t='Женщина', o='或る女', r='Aru onna', a=['arishima'], k='роман', y=1919, b=['s7', 'bjc3904', 'bjc3905', 'bjb5579']),
    dict(t='Потомок Каина', o='カインの末裔', r='Kain no matsuei', a=['arishima'], k='повесть', y=1917, b=['bjc3905']),
    dict(t='Куросиво', o='黒潮', r='Kuroshio', a=['tokutomiroka'], k='роман', y=1903, b=['az120', 'bjb5779']),
    dict(t='Сливовый календарь любви', o='春色梅児誉美', r='Shunshoku umegoyomi', a=['syunsuytamen'], k='роман', b=['az117', 'az138']),
    dict(t='Опоздавшая молодёжь', o='遅れてきた青年', r='Okurete kita seinen', a=['oekendz'], k='роман', y=1962, b=['bjc4195', 'r519746']),
    dict(t='Вырывай ростки, истребляй детёнышей', o='芽むしり仔撃ち', r='Memushiri kouchi', a=['oekendz'], k='роман', y=1958, b=['r488025', 'r519746']),
    dict(t='Исповедь «неполноценного» человека', o='人間失格', r='Ningen shikkaku', a=['dazai'], k='повесть', y=1948, b=['hy702203', 'b9']),
    dict(t='Краболов', o='蟹工船', r='Kani kōsen', a=['kobayasitakid'], k='повесть', y=1929, b=['bjc3911', 'bjb5640']),
    dict(t='Текстильщик Кодзи', a=['khosoivakid'], k='повесть', b=['bjb5823', 'bjb5824']),
    dict(t='Ключ', o='鍵', r='Kagi', a=['tanidzakidzyun'], k='роман', y=1956, b=['hy806761']),
    dict(t='Дневник безумного старика', o='瘋癲老人日記', r='Fūten rōjin nikki', a=['tanidzakidzyun'], k='роман', y=1961, b=['hy806761']),
    dict(t='Пять женщин, предавшихся любви', o='好色五人女', r='Kōshoku gonin onna', a=['ikharasayka'], k='повесть', y=1686, b=['az94']),
    dict(t='История любовных похождений одинокой женщины', o='好色一代女', r='Kōshoku ichidai onna', a=['ikharasayka'], k='повесть', y=1686, b=['x64', 'az94']),
    dict(t='Любовные похождения одинокого мужчины', o='好色一代男', r='Kōshoku ichidai otoko', a=['ikharasayka'], k='повесть', y=1682, b=['hy782628']),
    dict(t='Сказание о доме Тайра', o='平家物語', r='Heike monogatari', a=[], k='моногатари', b=['x36', 'az144']),
    dict(t='Ронины из Ако, или Повесть о сорока семи верных вассалах', o='赤穂浪士', r='Akō rōshi', a=['osaragidziro'], k='роман', y=1928, b=['iv1124']),
    dict(t='Столица в огне', a=['otokhikokaga'], k='роман-эпопея', b=['hy734556']),
    dict(t='Лабиринт', o='迷路', r='Meiro', a=['nogamiyaeko'], k='роман', b=['bjc4154']),
    dict(t='Песни Хиросимы', a=[], k='антология', b=['bjc3726']),
    dict(t='Басё. Лирика', a=['basho'], k='сборник', b=['wj580']),
    dict(t='«…Любуясь прекрасным, я жил, как хотел» (путевые дневники, избранная проза)', a=['basho'], k='сборник', b=['wj821']),
    dict(t='Кара моногатари. Средневековые японские рассказы о Китае', o='唐物語', r='Kara monogatari', a=[], k='моногатари', b=['ms36']),
    dict(t='Средневековые японские рассказы', a=[], k='антология', b=['wj939']),
    dict(t='Сборник японской научной фантастики', a=[], k='антология', b=['bjc3719']),
]
used = {i for g in M for i in g['b']} | {i for l in extend.values() for i in l}
assert not (used - unc_ids - {'s3', 's6'}) or True

# --- остальные: автоматически ---
PSEUDO = {'sborniki', 'pesnikhiros', 'vremenakhokus', 'mestakimiti'}
SWAP = {'kendzaburo': 'oekendz'}
FOREIGN = {'khernl': 'английский', 'dolinaleks': 'русский', 'ferrank': None, 'infantevp': 'русский', 'rinderf': None}
TAIL = [
    r'\s*\(серия «Чижик»\)$', r'\.\s*Коллекционное издание.*$', r'\.\s*(Роман|Повесть|Пьеса|Комедия)\b.*$', r'\.\s*(Сокр\.|Авториз\.|Пер\.|Hep\.|Обработ).*$',
    r'\.\s*Японская (народная )?(сказка|легенда)$', r'\.\s*Японская сказка$', r'\s*\((Для|В избранных).*\)$', r'\s*\[в \d томах\]$',
    r'\.\s*В \d-х т.*$', r'\.\s*Вольный перевод.*$', r'\.\s*Изд\. текста.*$', r'\s*Сост\. и пер\..*$', r'\.\s*Рассказы\.\s*\(Для.*$',
]
def clean(t):
    t = t.strip()
    for p in TAIL:
        t = re.sub(p, '', t)
    return t.strip(' .')
COLL = re.compile(r'^(Избранное|Избранные|Избранная|Рассказы|Повести|Новеллы|Стихи|Лирика|Драмы|Драматические поэмы|Шесть рассказов|Стихи и проза|Собрание стихотворений)', re.I)
def kind_of(b, authors, title):
    g = b['genre']
    if 'Фудоки' in title: return 'произведение (прочее)'
    if g == 'сказки': return 'сказки'
    if g == 'моногатари': return 'моногатари'
    if g == 'дзуйхицу': return 'дзуйхицу' if not COLL.match(title) else 'сборник'
    if not authors or len(authors) > 1: return 'антология'
    if COLL.match(title) or re.search(r'\.\s*—\s*|Повести и рассказы|Рассказы\b', b['title_ru']): return 'сборник'
    if re.search(r'Стихотворени|стих|лирик|поэз', title, re.I) and g == 'поэзия': return 'стихи'
    return {'роман': 'роман', 'повесть': 'повесть', 'новеллы': 'сборник', 'поэзия': 'стихи', 'драма': 'пьеса'}[g]

def norm(s):
    s = unicodedata.normalize('NFKC', s or '').lower().replace('ё', 'е')
    return ' '.join(re.sub(r'[^\w]+', ' ', s).split())
CJK = re.compile(r'[぀-ヿ一-鿿]')
auto = collections.OrderedDict()
for b in unc:
    if b['id'] in used: continue
    authors = [SWAP.get(a, a) for a in b['authors'] if a not in PSEUDO]
    title = clean(b['title_ru'])
    o = b['title_orig'] if b['title_orig'] and CJK.search(b['title_orig']) and not re.search(r'[・.]', b['title_orig']) else None
    k = (tuple(sorted(authors)), norm(o) if o else norm(title))
    g = auto.setdefault(k, dict(t=title, o=o, r=b['title_romaji'] if o else None, a=authors, books=[], src=b))
    g['books'].append(b['id'])

def year_of(b):
    y = b.get('orig_year')
    if isinstance(y, int): return y
    m = re.fullmatch(r'\s*(\d{4})\s*', str(y or ''))
    return int(m.group(1)) if m else None

new = []
def add(wid, title, orig, romaji, authors, kind, year, books):
    w = {'id': wid, 'authors': authors, 'title_ru': title, 'title_orig': orig, 'title_romaji': romaji, 'kind': kind}
    if year: w['year'] = year
    w['books'] = books
    fa = [a for a in authors if a in FOREIGN]
    if fa:
        w['foreign'] = True
        if FOREIGN[fa[0]]: w['lang'] = FOREIGN[fa[0]]
    new.append(w)
for g in M:
    add(f"wc-{g['b'][0]}" if not any(w['id'] == f"wc-{g['b'][0]}" for w in new) else f"wc-{g['b'][0]}-{len(new)}",
        g['t'], g.get('o'), g.get('r'), g['a'], g['k'], g.get('y'), g['b'])
for g in auto.values():
    b = g['src']
    add(f"wc-{g['books'][0]}", g['t'], g['o'], g['r'], g['a'], kind_of(b, g['a'], g['t']), year_of(b), g['books'])

ids = [w['id'] for w in new]
assert len(ids) == len(set(ids)), [i for i in ids if ids.count(i) > 1]
missing = unc_ids - {i for w in new for i in w['books']} - {i for l in extend.values() for i in l}
print('uncovered', len(unc), 'new works', len(new), 'missing', missing, 'fixed books', len(fixes), file=sys.stderr)
print(collections.Counter(w['kind'] for w in new).most_common(), file=sys.stderr)

# --- удалить мангу и комиксы ---
COM = {'манга', 'комикс', 'графический роман'}
MANGA_CYCLES = {'w138914', 'w225457', 'w225467', 'w225469', 'w226889', 'w226919', 'w226921', 'w228477', 'w257731'}
before = len(c['works'])
removed = [w['id'] for w in c['works'] if w['kind'] in COM or w['id'] in MANGA_CYCLES]
c['works'] = [w for w in c['works'] if w['id'] not in removed]
for w in c['works']:
    if w['id'] in extend: w['books'] = list(dict.fromkeys((w.get('books') or []) + extend[w['id']]))
c['works'] += new
print('removed', len(removed), 'works', before, '->', len(c['works']), file=sys.stderr)
json.dump({'removed': removed, 'new': new, 'fixes': fixes}, open(SP + '/gen-result.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
if '--write' in sys.argv:
    s = json.dumps(c, ensure_ascii=False, indent=1)
    open('data/catalog.json', 'w', encoding='utf-8', newline='\n').write(s + '\n')
