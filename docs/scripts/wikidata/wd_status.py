"""For every used author: does it have a bio source (own bio or ruwiki via Wikidata) and a portrait (own image or P18)?
Usage: python wd_status.py <catalog.json> <author_fixes.json> <out.json>"""
import json, sys, time, urllib.parse, urllib.request

UA = {'User-Agent': 'jp-lit-catalog-script/1.0 (bibliography prototype)', 'Accept': 'application/sparql-results+json'}
cat = json.load(open(sys.argv[1], encoding='utf-8'))
fx = json.load(open(sys.argv[2], encoding='utf-8'))
for a in cat['authors']:
    r = fx['rename'].get(a['id'])
    if r:
        a.update(r if isinstance(r, dict) else {'name_ru': r})
used = {}
for b in cat['books']:
    for x in b['authors'] + [w.get('a') for w in b.get('contents') or [] if w.get('a')]:
        used.setdefault(x, []).append(b['id'])
qs = sorted({a['wikidata'] for a in cat['authors'] if a.get('wikidata')})
info = {}
for i in range(0, len(qs), 150):
    vals = ' '.join('wd:' + q for q in qs[i:i + 150])
    q = f"""SELECT ?item ?ruwiki ?img ?desc WHERE {{ VALUES ?item {{ {vals} }}
      OPTIONAL {{ ?ruwiki schema:about ?item ; schema:isPartOf <https://ru.wikipedia.org/> }}
      OPTIONAL {{ ?item wdt:P18 ?img }}
      OPTIONAL {{ ?item schema:description ?desc FILTER(lang(?desc)='en') }} }}"""
    for k in range(5):
        try:
            req = urllib.request.Request('https://query.wikidata.org/sparql', data=urllib.parse.urlencode({'query': q}).encode(), headers=UA)
            rows = json.load(urllib.request.urlopen(req, timeout=90))['results']['bindings']
            break
        except Exception as e:
            print('retry', e); time.sleep(10 * (k + 1)); rows = []
    for r in rows:
        d = info.setdefault(r['item']['value'].rsplit('/', 1)[1], {})
        if 'ruwiki' in r: d['ruwiki'] = r['ruwiki']['value']
        if 'img' in r: d['img'] = r['img']['value']
        if 'desc' in r: d['desc'] = r['desc']['value']
    time.sleep(2)
out = []
for a in cat['authors']:
    if a['id'] not in used:
        continue
    w = info.get(a.get('wikidata'), {})
    out.append({'id': a['id'], 'name_ru': a['name_ru'], 'name_orig': a.get('name_orig'), 'full_name': a.get('full_name'),
                'wikidata': a.get('wikidata'), 'has_bio': bool(a.get('bio') or w.get('ruwiki')),
                'has_img': bool(a.get('image') or w.get('img')), 'wd_img': w.get('img'), 'desc': w.get('desc'),
                'books': used[a['id']]})
json.dump(out, open(sys.argv[3], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('used', len(out), 'no bio', sum(not x['has_bio'] for x in out), 'no img', sum(not x['has_img'] for x in out),
      'wd img not local', sum(1 for x in out if x['wd_img']))
