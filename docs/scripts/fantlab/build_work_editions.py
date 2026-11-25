# Собирает data/work-editions.json — публикации произведений на русском по данным Фантлаба —
# из карточек, скачанных fetch_work_editions.py.
# Берутся блоки «Издания» (10), «Периодика» (20) и «Комиксы» (32); аудиокниги, самиздат, планы издательств
# и издания на других языках пропускаются. Издание сопоставляется с книгой каталога по ISBN,
# а без ISBN — по году, названию и автору.
# Запуск: python build_work_editions.py data/catalog.json <папка с карточками> data/work-editions.json
import json, os, re, sys
cat_path, src, out = sys.argv[1:4]
cat = json.load(open(cat_path, encoding='utf-8'))
BLOCKS = {'10': 'книга', '20': 'журнал', '32': 'книга'}

def untag(s):  # [pub=324]Эксмо[/pub] → Эксмо
    return re.sub(r'\[/?[a-z]+(=[^\]]*)?\]', '', s or '').strip()
def norm(s):
    s = (s or '').lower().replace('ё', 'е')
    return re.sub(r'[^\w]+', ' ', s).strip()
def isbns(s):
    return {re.sub(r'[^0-9x]', '', p.lower()) for p in re.split(r'[,;]', s or '') if re.sub(r'[^0-9x]', '', p.lower())}

by_isbn, by_year = {}, {}
for b in cat['books']:
    for i in isbns(b.get('isbn')): by_isbn.setdefault(i, b)
    if b.get('year'): by_year.setdefault(b['year'], []).append(b)

def match(e, authors):
    for i in isbns(e.get('isbn')):
        if i in by_isbn: return by_isbn[i]['id']
    t = norm(untag(e.get('name')))
    for b in by_year.get(e.get('year'), []):
        if norm(b['title_ru']) == t and (set(b['authors']) & set(authors) or not authors): return b['id']
    return None

result, stats = {}, {'works': 0, 'pubs': 0, 'matched': 0}
for w in cat['works']:
    fid = w.get('fantlab')
    p = os.path.join(src, f'{fid}.json')
    if not fid or not os.path.exists(p): continue
    d = json.load(open(p, encoding='utf-8'))
    names, titles = {}, []
    for lang in d.get('translations') or []:
        if lang.get('lang_code') != 'ru': continue
        for tr in lang.get('translations') or []:
            for t in tr.get('translators') or []: names[str(t['id'])] = t['name']
            for t in tr.get('titles') or []:
                if t['title'] and norm(t['title']) != norm(w['title_ru']) and t['title'] not in titles: titles.append(t['title'])
    pubs, seen = [], set()
    for key, block in (d.get('editions_blocks') or {}).items():
        if key not in BLOCKS: continue
        for e in block.get('list') or []:
            if e.get('lang_code') not in (None, '', 'ru') or e['edition_id'] in seen: continue
            seen.add(e['edition_id'])
            pub = {'fl': e['edition_id'], 'title': untag(e.get('name')), 'kind': BLOCKS[key]}
            if e.get('year'): pub['year'] = e['year']
            if untag(e.get('publisher')): pub['publisher'] = untag(e.get('publisher'))
            if e.get('pages'): pub['pages'] = e['pages']
            tr = [names[i] for i in str(e.get('translators') or '').split(',') if i in names]
            if tr: pub['tr'] = tr
            b = match(e, w['authors'])
            if b: pub['book'] = b; stats['matched'] += 1
            pubs.append(pub)
    info = {'pubs': pubs}
    if names: info['tr'] = list(dict.fromkeys(names.values()))
    if titles: info['titles'] = titles
    result[w['id']] = info
    stats['works'] += 1; stats['pubs'] += len(pubs)
json.dump(result, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(stats, os.path.getsize(out), 'bytes')
