import json, urllib.request, urllib.parse, time, re
H={'User-Agent':'jlit-catalog-prototype/0.1'}
get=lambda u: json.load(urllib.request.urlopen(urllib.request.Request(u,headers=H),timeout=30))
def ed(eid):
    d=get(f'https://api.fantlab.ru/edition/{eid}'); time.sleep(0.3)
    pub=[p['name'] for p in (d.get('creators') or {}).get('publishers') or []]
    return d,pub
for eid in [86870,31073,455889,58599,260286,466084,426980,34625,143525,6678,96836,6680,6676]:
    d,pub=ed(eid)
    print(f"{eid} | {d['edition_name']} | {d['year']} | {pub} | {d.get('pages')} | series={[s.get('name') for s in d.get('series') or []]}")
    print('   notes:',re.sub(r'\s+',' ',d.get('notes') or '')[:400])
for q in ['Басё лирика','Басё','Конрад Японская литература','Григорьева Японская художественная традиция']:
    try:
        r=get('https://api.fantlab.ru/search-editions?q='+urllib.parse.quote(q))
        r=r if isinstance(r,list) else r.get('matches',[])
        print('##',q,len(r))
        for m in r[:15]: print('   ',m.get('edition_id'),m.get('name'),m.get('year'),m.get('publisher'),m.get('autors'))
    except Exception as e: print(q,'ERR',e)
    time.sleep(0.4)
