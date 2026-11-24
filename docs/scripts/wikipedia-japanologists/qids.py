import json, urllib.request, urllib.parse, time
UA = {'User-Agent': 'catalog-research/1.0 (personal bibliography project)'}
ps = json.load(open('persons.json', encoding='utf-8'))
titles = sorted({p['title'] for p in ps if p.get('title')})
res = {}
for i in range(0, len(titles), 50):
    q = {'action': 'query', 'prop': 'pageprops|pageimages', 'ppprop': 'wikibase_item', 'redirects': '1', 'format': 'json', 'titles': '|'.join(titles[i:i + 50])}
    r = json.load(urllib.request.urlopen(urllib.request.Request('https://ru.wikipedia.org/w/api.php?' + urllib.parse.urlencode(q), headers=UA)))
    red = {x['to']: x['from'] for x in r['query'].get('redirects', [])}
    norm = {x['to']: x['from'] for x in r['query'].get('normalized', [])}
    for pg in r['query']['pages'].values():
        t = pg['title']; orig = norm.get(red.get(t, t), red.get(t, t))
        if 'missing' in pg: continue
        res[orig] = {'q': pg.get('pageprops', {}).get('wikibase_item'), 'title': t}
    time.sleep(1)
json.dump(res, open('qids.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(titles), len(res), sum(1 for v in res.values() if v['q']))
