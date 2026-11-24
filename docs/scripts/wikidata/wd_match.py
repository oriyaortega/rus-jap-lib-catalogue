"""Find Wikidata items for catalog authors that have no wikidata and no bio.
Usage: python wd_match.py <catalog.json> <out.json>
Writes candidates: {author_id: {q, label_ru, label_ja, desc_ru, desc_en, ruwiki, image, born, died, matched_by, n_humans}}"""
import json, re, sys, time, urllib.parse, urllib.request

UA = {'User-Agent': 'jp-lit-catalog-script/1.0'}
CJK = re.compile(r'[぀-ヿ一-鿿]')


def get(url):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return json.load(r)
        except Exception as e:
            time.sleep(2 + 3 * i)
    return None


def search(text, lang):
    q = urllib.parse.urlencode({'action': 'wbsearchentities', 'search': text, 'language': lang, 'uselang': lang,
                                'format': 'json', 'limit': 7, 'type': 'item'})
    d = get('https://www.wikidata.org/w/api.php?' + q)
    return [x['id'] for x in (d or {}).get('search', [])]


def entities(ids):
    out = {}
    for i in range(0, len(ids), 40):
        q = urllib.parse.urlencode({'action': 'wbgetentities', 'ids': '|'.join(ids[i:i + 40]), 'format': 'json',
                                    'props': 'labels|descriptions|claims|sitelinks|aliases', 'languages': 'ru|ja|en'})
        d = get('https://www.wikidata.org/w/api.php?' + q)
        out.update((d or {}).get('entities', {}))
    return out


def norm(s):
    return re.sub(r'[\s・·.\-‐()（）「」]', '', (s or '')).lower().replace('ё', 'е')


def year(e, p):
    try:
        return int(e['claims'][p][0]['mainsnak']['datavalue']['value']['time'][1:5])
    except Exception:
        return None


cat = json.load(open(sys.argv[1], encoding='utf-8'))
used = {a for b in cat['books'] for a in b['authors'] + [w.get('a') for w in b.get('contents') or [] if w.get('a')]}
todo = [a for a in cat['authors'] if not a.get('wikidata') and not a.get('bio') and a['id'] in used]
res = {}
for n, a in enumerate(todo):
    orig = a.get('name_orig') or ''
    ru = a['name_ru']
    queries = []
    if orig and CJK.search(orig):
        queries.append((orig.replace(' ', ''), 'ja'))
        queries.append((orig, 'ja'))
    parts = ru.split()
    if len(parts) >= 2:
        queries.append((' '.join(parts[1:] + parts[:1]), 'ru'))
    queries.append((ru, 'ru'))
    if orig and not CJK.search(orig):
        queries.append((orig, 'en'))
    ids = []
    for t, l in queries:
        for i in search(t, l):
            if i not in ids:
                ids.append(i)
    ents = entities(ids) if ids else {}
    keys_ru = {norm(ru), norm(' '.join(parts[1:] + parts[:1]))}
    hits = []
    for q, e in ents.items():
        p31 = [c['mainsnak'].get('datavalue', {}).get('value', {}).get('id') for c in e.get('claims', {}).get('P31', [])]
        if 'Q5' not in p31:
            continue
        labels = {l: v['value'] for l, v in e.get('labels', {}).items()}
        al = {l: [x['value'] for x in v] for l, v in e.get('aliases', {}).items()}
        how = None
        if orig and CJK.search(orig) and norm(orig) in {norm(x) for x in [labels.get('ja')] + al.get('ja', [])}:
            how = 'ja'
        elif keys_ru & {norm(x) for x in [labels.get('ru')] + al.get('ru', [])}:
            how = 'ru'
        elif orig and not CJK.search(orig) and norm(orig) in {norm(x) for x in [labels.get('en')] + al.get('en', [])}:
            how = 'en'
        if not how:
            continue
        img = e.get('claims', {}).get('P18')
        hits.append({'q': q, 'label_ru': labels.get('ru'), 'label_ja': labels.get('ja'),
                     'desc_ru': e.get('descriptions', {}).get('ru', {}).get('value'),
                     'desc_en': e.get('descriptions', {}).get('en', {}).get('value'),
                     'ruwiki': e.get('sitelinks', {}).get('ruwiki', {}).get('title'),
                     'image': img[0]['mainsnak']['datavalue']['value'] if img else None,
                     'born': year(e, 'P569'), 'died': year(e, 'P570'), 'matched_by': how})
    if hits:
        res[a['id']] = {'name_ru': ru, 'name_orig': orig, 'hits': hits}
    print(n, a['id'], ru, len(hits), flush=True)
json.dump(res, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('matched', len(res), 'of', len(todo))
