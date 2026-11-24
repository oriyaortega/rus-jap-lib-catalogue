"""Find Wikidata people for catalog authors without QIDs by exact Russian label (both word orders), in one SPARQL query.
Adds results to inbox/orig_names.json. Usage: python sparql_orig.py <catalog.json>"""
import json, os, re, sys, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from people import core_words

OUT = os.path.join(HERE, 'inbox', 'orig_names.json')
cat = json.load(open(sys.argv[1], encoding='utf-8'))
res = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}
RUS = re.compile(r'(ов|ев|ёв|ин|ын|ова|ева|ина|ына|ский|ская|цкий|цкая|енко|ук|юк|ых|их)$')

labels = {}
for a in cat['authors']:
    if a.get('wikidata') or res.get(a['id']):
        continue
    ws = core_words(a['name_ru'])
    if not ws or (len(ws) > 1 and RUS.search(ws[0].lower())):
        continue
    for v in {' '.join(ws), ' '.join(reversed(ws)), a['name_ru']}:
        labels.setdefault(v, set()).add(a['id'])

esc = lambda s: s.replace('\\', '\\\\').replace('"', '\\"')
found = {}
items = sorted(labels)
for i in range(0, len(items), 150):
    vals = ' '.join(f'"{esc(l)}"@ru' for l in items[i:i + 150])
    q = f'''SELECT ?l ?p ?ja ?en ?nat ?natlang (GROUP_CONCAT(DISTINCT ?c) AS ?cs) WHERE {{
  VALUES ?l {{ {vals} }}
  {{ ?p rdfs:label ?l }} UNION {{ ?p skos:altLabel ?l }}
  ?p wdt:P31 wd:Q5 .
  OPTIONAL {{ ?p rdfs:label ?ja FILTER(lang(?ja)="ja") }}
  OPTIONAL {{ ?p rdfs:label ?en FILTER(lang(?en)="en") }}
  OPTIONAL {{ ?p wdt:P1559 ?nat BIND(lang(?nat) AS ?natlang) }}
  OPTIONAL {{ ?p wdt:P27 ?c }}
}} GROUP BY ?l ?p ?ja ?en ?nat ?natlang'''
    u = 'https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': q, 'format': 'json'})
    data = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'jlit-catalog-prototype/0.1', 'Accept': 'application/sparql-results+json'}), timeout=120))
    for b in data['results']['bindings']:
        g = lambda k: b.get(k, {}).get('value')
        found.setdefault(g('l'), []).append({'q': g('p').rsplit('/', 1)[1], 'ja': g('ja'), 'en': g('en'), 'native': g('nat'), 'lang': g('natlang'),
                                             'country': [c.rsplit('/', 1)[1] for c in (g('cs') or '').split() if c], 'human': True})

amb = []
for label, people in found.items():
    uniq = {p['q']: p for p in people}
    for aid in labels[label]:
        if res.get(aid):
            continue
        if len(uniq) == 1:
            res[aid] = next(iter(uniq.values()))
        else:
            # prefer a Japanese person among homonyms
            jp = [p for p in uniq.values() if p['ja'] and re.search('[㐀-鿿]', p['ja'])]
            res[aid] = jp[0] if len(jp) == 1 else None
            amb.append((aid, label, list(uniq)))
json.dump(res, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('labels', len(labels), 'matched', sum(1 for l in found), 'ambiguous', amb)
