import json, urllib.request, urllib.parse, time, sys
H={'User-Agent':'jlit-catalog-prototype/0.1'}
def get(u):
    return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=H),timeout=30))
Q=[('b1','Ваш покорный слуга кот'),('b2','Ворота Расёмон'),('b3','Снежная страна'),('b4','Золотой храм'),('b5','Охота на овец'),('b6','Записки у изголовья'),('b7','Повесть о Гэндзи'),('b8','Басё'),('b9','Исповедь неполноценного человека'),('b10','Женщина в песках'),('b11','Ветка сакуры'),('b12','Японская литература от Кодзики'),('b13','Японская художественная традиция')]
out={}
for bid,q in Q:
    try:
        r=get('https://api.fantlab.ru/search-works?q='+urllib.parse.quote(q)+'&page=1')
    except Exception as e:
        print(bid,'ERR',e); continue
    res=r if isinstance(r,list) else r.get('matches',r)
    out[bid]=res[:6] if isinstance(res,list) else res
    for m in (res[:6] if isinstance(res,list) else []):
        print(bid,m.get('work_id') or m.get('id'),m.get('rusname') or m.get('name'),'|',m.get('autor_rusname') or m.get('all_autor_rusname'),m.get('year'))
    time.sleep(0.5)
json.dump(out,open('fl_demo_search.json','w',encoding='utf-8'),ensure_ascii=False)
