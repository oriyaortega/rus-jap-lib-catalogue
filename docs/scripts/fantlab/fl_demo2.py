import json, urllib.request, time
H={'User-Agent':'jlit-catalog-prototype/0.1'}
get=lambda u: json.load(urllib.request.urlopen(urllib.request.Request(u,headers=H),timeout=30))
W={'b1':378539,'b2':128586,'b3':262047,'b4':255972,'b5':15839,'b6':502877,'b6b':502876,'b7':502865,'b7b':502866,'b9':643102,'b10':160395,'b11':827595}
want={'b1':1960,'b2':1974,'b3':1971,'b4':1993,'b5':2002,'b6':1975,'b6b':1975,'b7':1991,'b7b':1991,'b9':2004,'b10':1966,'b11':1971}
res={}
for b,w in W.items():
    d=get(f'https://api.fantlab.ru/work/{w}/extended')
    eds=[]
    for blk in (d.get('editions_blocks') or {}).values():
        for e in blk.get('list',[]):
            eds.append((e.get('year'),e.get('edition_id'),e.get('name'),e.get('autors') if isinstance(e.get('autors'),str) else ''))
    eds.sort(key=lambda x:(x[0] or 0))
    res[b]=eds
    print('==',b,w,d.get('work_name'),'| editions:',len(eds))
    for e in eds:
        if e[0] and abs(e[0]-want[b])<=6 or len(eds)<=8: print('  ',e)
    time.sleep(0.5)
json.dump(res,open('fl_demo_eds.json','w',encoding='utf-8'),ensure_ascii=False)
