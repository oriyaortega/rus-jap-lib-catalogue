"""Collect original-language names for catalog authors from Wikidata.
Writes inbox/orig_names.json: {author_id: {q, ja, en, native, country, lang, ru}}.
Usage: python fetch_orig.py <catalog.json>"""
import json, os, re, sys, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from people import fold, core_words

API = 'https://www.wikidata.org/w/api.php?'
UA = {'User-Agent': 'jlit-catalog-prototype/0.1'}
OUT = os.path.join(HERE, 'inbox', 'orig_names.json')


def get(params):
    for attempt in range(4):
        try:
            u = API + urllib.parse.urlencode({**params, 'format': 'json'})
            return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30))
        except Exception as e:
            print('retry', e, file=sys.stderr)
            time.sleep(5 * (attempt + 1))
    return {}


def claim_ids(e, p):
    return [c['mainsnak'].get('datavalue', {}).get('value', {}).get('id') for c in e.get('claims', {}).get(p, [])]


def native(e):
    for c in e.get('claims', {}).get('P1559', []):
        v = c['mainsnak'].get('datavalue', {}).get('value')
        if v:
            return v.get('text'), v.get('language')
    return None, None


def summarize(q, e):
    lab = lambda l: e.get('labels', {}).get(l, {}).get('value')
    nat, lang = native(e)
    return {'q': q, 'ja': lab('ja'), 'en': lab('en'), 'ru': lab('ru'), 'native': nat, 'lang': lang,
            'country': [x for x in claim_ids(e, 'P27') if x], 'human': 'Q5' in claim_ids(e, 'P31')}


def entities(ids):
    out = {}
    for i in range(0, len(ids), 50):
        r = get({'action': 'wbgetentities', 'ids': '|'.join(ids[i:i + 50]), 'props': 'labels|claims', 'languages': 'ru|ja|en'})
        out.update(r.get('entities', {}))
        time.sleep(1)
    return out


def main():
    cat = json.load(open(sys.argv[1], encoding='utf-8'))
    res = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}
    authors = cat['authors']
    # 1) authors with QIDs
    qa = {a['wikidata']: a['id'] for a in authors if a.get('wikidata') and a['id'] not in res}
    ents = entities(list(qa))
    for q, e in ents.items():
        if 'missing' not in e:
            res[qa[q]] = summarize(q, e)
    # 2) authors without QIDs: search by Russian name, both word orders
    for a in authors:
        if a.get('wikidata') or a['id'] in res:
            continue
        ws = core_words(a['name_ru'])
        if len(ws) < 2:
            res[a['id']] = None
            continue
        want = sorted(fold(w) for w in ws)
        found = None
        for query in (' '.join(ws), ' '.join(reversed(ws))):
            r = get({'action': 'wbsearchentities', 'search': query, 'language': 'ru', 'uselang': 'ru', 'limit': 7})
            cands = [x['id'] for x in r.get('search', [])]
            time.sleep(0.7)
            if not cands:
                continue
            for q, e in entities(cands).items():
                s = summarize(q, e)
                names = [s['ru'] or ''] + [x['value'] for x in e.get('aliases', {}).get('ru', [])] if 'aliases' in e else [s['ru'] or '']
                if s['human'] and any(sorted(fold(w) for w in core_words(re.sub(',', ' ', n))) == want for n in names):
                    found = s
                    break
            if found:
                break
        res[a['id']] = found
        print(a['name_ru'], '->', found and (found['q'], found['ja'], found['en']), file=sys.stderr)
        json.dump(res, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(res, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


main()
