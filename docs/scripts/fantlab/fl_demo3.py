import json, urllib.request, time
H={'User-Agent':'jlit-catalog-prototype/0.1'}
get=lambda u: json.load(urllib.request.urlopen(urllib.request.Request(u,headers=H),timeout=30))
eds=json.load(open('fl_demo_eds.json',encoding='utf-8'))
for b in ['b5','b9','b10']:
    print('==',b); [print('  ',e[:3]) for e in eds[b] if e[0] and e[0]<2010]
for eid in [86870,31073,455889,58599,260286,466084,426980,34625,143525]:
    d=get(f'https://api.fantlab.ru/edition/{eid}')
    print(eid,'|',d.get('edition_name'),'|',d.get('year'),'|',[p.get('name') for p in d.get('publisher') or []] if isinstance(d.get('publisher'),list) else d.get('publisher'),'|',d.get('pages'),'| tr:',(d.get('description') or '')[:0])
    print('    keys:',[k for k in d if d[k]][:40])
    time.sleep(0.4)
json.dump(get('https://api.fantlab.ru/edition/86870'),open('ed_sample.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
