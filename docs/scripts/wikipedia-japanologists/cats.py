import json, urllib.request, urllib.parse, time
UA = {'User-Agent': 'catalog-research/1.0 (personal bibliography project)'}
out = {}
for cat in ['Японисты Российской империи', 'Японисты СССР', 'Японисты России']:
    members, cont = [], {}
    while True:
        q = {'action': 'query', 'list': 'categorymembers', 'cmtitle': 'Категория:' + cat, 'cmlimit': '500', 'cmtype': 'page|subcat', 'format': 'json', **cont}
        r = json.load(urllib.request.urlopen(urllib.request.Request('https://ru.wikipedia.org/w/api.php?' + urllib.parse.urlencode(q), headers=UA)))
        members += [m['title'] for m in r['query']['categorymembers']]
        if 'continue' not in r: break
        cont = r['continue']; time.sleep(1)
    out[cat] = members
    print(cat, len(members), [m for m in members if m.startswith('Категория')])
    time.sleep(1)
json.dump(out, open('cats.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
