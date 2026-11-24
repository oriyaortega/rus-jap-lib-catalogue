import json, urllib.request, time, re
H={'User-Agent':'jlit-catalog-prototype/0.1'}
get=lambda u: json.load(urllib.request.urlopen(urllib.request.Request(u,headers=H),timeout=30))
for eid in [256157,143525,455889,58599,6678,34625,260286,466084]:
    d=get(f'https://api.fantlab.ru/edition/{eid}/extended'); time.sleep(0.3)
    pub=[p['name'] for p in (d.get('creators') or {}).get('publishers') or []]
    print('==',eid,d['edition_name'],d['year'],pub,d.get('pages'),'city?',[k for k in d if 'city' in k or 'place' in k])
    c=d.get('edition_content') or d.get('content') or []
    txt=json.dumps(c,ensure_ascii=False)
    print('   ',re.sub(r'\s+',' ',txt)[:700])
