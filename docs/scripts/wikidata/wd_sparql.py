"""Batch-match catalog authors without wikidata/bio to Wikidata humans via SPARQL (labels and aliases).
Usage: python wd_sparql.py <catalog.json> <out.json>"""
import json, re, sys, time, urllib.parse, urllib.request

UA = {'User-Agent': 'jp-lit-catalog-script/1.0 (bibliography prototype)', 'Accept': 'application/sparql-results+json'}
CJK = re.compile(r'[぀-ヿ一-鿿]')


def sparql(q):
    for i in range(5):
        try:
            req = urllib.request.Request('https://query.wikidata.org/sparql',
                                         data=urllib.parse.urlencode({'query': q}).encode(), headers=UA)
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.load(r)['results']['bindings']
        except Exception as e:
            print('retry', i, e, flush=True)
            time.sleep(10 * (i + 1))
    return []


def lit(s, lang):
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"@' + lang


cat = json.load(open(sys.argv[1], encoding='utf-8'))
used = {a for b in cat['books'] for a in b['authors'] + [w.get('a') for w in b.get('contents') or [] if w.get('a')]}
todo = [a for a in cat['authors'] if not a.get('wikidata') and not a.get('bio') and a['id'] in used]

keys = {}  # literal -> [author ids]
for a in todo:
    orig = a.get('name_orig') or ''
    cands = []
    if orig and CJK.search(orig):
        cands += [(orig, 'ja'), (orig.replace(' ', ''), 'ja')]
    elif orig:
        cands += [(orig, 'en')]
    p = a['name_ru'].split()
    if len(p) >= 2 and not a['name_ru'].endswith('.'):
        cands += [(' '.join(p[1:] + p[:1]), 'ru'), (a['name_ru'], 'ru')]
        if len(p) == 2:
            cands += [(p[1] + ' ' + p[0], 'ru')]
    for c in cands:
        keys.setdefault(c, set()).add(a['id'])

items = list(keys)
rows = []
for i in range(0, len(items), 60):
    vals = ' '.join(lit(t, l) for t, l in items[i:i + 60])
    q = f"""SELECT ?name ?item ?itemLabel ?ruLabel ?desc ?descEn ?ruwiki ?img ?born ?died WHERE {{
  VALUES ?name {{ {vals} }}
  {{ ?item rdfs:label ?name }} UNION {{ ?item skos:altLabel ?name }}
  ?item wdt:P31 wd:Q5 .
  OPTIONAL {{ ?item rdfs:label ?ruLabel FILTER(lang(?ruLabel)='ru') }}
  OPTIONAL {{ ?item schema:description ?desc FILTER(lang(?desc)='ru') }}
  OPTIONAL {{ ?item schema:description ?descEn FILTER(lang(?descEn)='en') }}
  OPTIONAL {{ ?ruwiki schema:about ?item ; schema:isPartOf <https://ru.wikipedia.org/> }}
  OPTIONAL {{ ?item wdt:P18 ?img }}
  OPTIONAL {{ ?item wdt:P569 ?born }}
  OPTIONAL {{ ?item wdt:P570 ?died }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "ru,en,ja". }}
}}"""
    r = sparql(q)
    rows += r
    print('batch', i, len(r), flush=True)
    time.sleep(2)

res = {}
for r in rows:
    name = r['name']['value']
    lang = r['name'].get('xml:lang')
    for aid in keys.get((name, lang), []):
        q = r['item']['value'].rsplit('/', 1)[1]
        d = res.setdefault(aid, {})
        if q not in d:
            d[q] = {'by': lang, 'ru': r.get('ruLabel', {}).get('value'), 'desc': r.get('desc', {}).get('value'),
                    'descEn': r.get('descEn', {}).get('value'),
                    'ruwiki': r.get('ruwiki', {}).get('value'), 'img': r.get('img', {}).get('value'),
                    'born': r.get('born', {}).get('value', '')[:4], 'died': r.get('died', {}).get('value', '')[:4]}
json.dump(res, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('authors with candidates', len(res), 'of', len(todo))
