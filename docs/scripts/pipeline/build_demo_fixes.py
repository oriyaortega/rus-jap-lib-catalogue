import json, urllib.request, time
H={'User-Agent':'jlit-catalog-prototype/0.1'}
get=lambda u: json.load(urllib.request.urlopen(urllib.request.Request(u,headers=H),timeout=30))
M={
 'b1':(86870,{'publisher':'Гослитиздат','city':'Москва','translators':['korshikovlev','strugatsky']}),
 'b2':(31073,{'publisher':'Художественная литература','city':'Москва'}),
 'b3':(455889,{'title_ru':'Тысячекрылый журавль. Снежная страна. Новеллы, рассказы, эссе','publisher':'Прогресс','city':'Москва','translators':['rakhim']}),
 'b4':(58599,{'publisher':'Северо-Запад','city':'Санкт-Петербург'}),
 'b5':(6678,{'publisher':'Амфора','city':'Санкт-Петербург'}),
 'b6':(260286,{'publisher':'Художественная литература','city':'Москва'}),
 'b7':(466084,{'publisher':'Наука','city':'Москва'}),
 'b8':(256157,{'publisher':'Художественная литература','city':'Москва'}),
 'b9':(143525,{'title_ru':'Цветы шутовства','publisher':'Восточная литература','city':'Москва','translators':['skalnikvikto']}),
 'b10':(34625,{'title_ru':'Женщина в песках. Чужое лицо','publisher':'Художественная литература','city':'Москва'}),
 'b11':(426980,{'publisher':'Молодая гвардия','city':'Москва'}),
}
out={}
for b,(eid,o) in M.items():
    d=get(f'https://api.fantlab.ru/edition/{eid}'); time.sleep(0.3)
    f={'year':d['year'],'pages':d.get('pages'),'cover':f'https://fantlab.ru/images/editions/big/{eid}','source':f'https://fantlab.ru/edition{eid}'}
    if d.get('copies'): f['print_run']=d['copies']
    if d.get('isbns'): f['isbn']=d['isbns'][0]
    f.update(o); out[b]=f
json.dump(out,open('demo_fixes.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print(json.dumps(out,ensure_ascii=False,indent=0))
