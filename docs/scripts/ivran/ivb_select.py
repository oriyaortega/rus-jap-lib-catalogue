import json,re,sys
b=json.load(open('ivb_books.json',encoding='utf-8'))
cat=json.load(open(sys.argv[1],encoding='utf-8'))
def nt(s): return re.sub(r'[^a-zа-яё0-9]','',(s or '').lower().replace('ё','е'))
ex={}
for x in cat['books']:
    ex.setdefault(nt(x['title_ru'])[:40],[]).append(x)
JP=re.compile(r'япон|айн|синто|токио|окинав|хоккайд|самура|эдо\b|хайку|танка|киото|ямато|сэнгоку|тайхо|кокинвак|норито|сэммё|синтё|догэн|митидзанэ|цусим|мицубиси|сумитомо|кавабат|сики|сантока|сётэцу|сиратори|кацура|ако\b|формоз|тайвань|халхин',re.I)
GEN=re.compile(r'Востока|Азии и Африки|афро-азиат|Востоковед|Диаспор|Труды Института|Проблемы общей|Ученые записки|востоковед|Orientalistica|мировых религий|Страны Востока|ТРУДЫ|ГРУДЫ|международных отношений в Азии|Большой игре|кавказских|Древность',re.I)
sel=[];dup=[];skip=[]
for x in sorted(b.values(),key=lambda x:x['ivb']):
    t=x['title']; a=x['ann'] or ''
    jp=bool(JP.search(t)) or len(re.findall(r'япон',a,re.I))>=2
    gen=bool(GEN.search(t)) and not re.search(r'япон',t,re.I)
    key=nt(t)[:40]
    m=[c for c in ex.get(key,[]) if not c.get('year') or not x['year'] or abs(c['year']-x['year'])<=1]
    if m: dup.append((x,m[0]['id']))
    elif jp and not gen: sel.append(x)
    else: skip.append(x)
print('select',len(sel),'dup',len(dup),'skip',len(skip))
json.dump({'sel':[x['ivb'] for x in sel],'dup':[(x['ivb'],i) for x,i in dup],'skip':[x['ivb'] for x in skip]},open('ivb_sel.json','w'),indent=0)
print('--- DUP'); [print(x['ivb'],x['year'],x['title'][:70],'->',i) for x,i in dup]
print('--- SKIP'); [print(x['ivb'],x['year'],x['title'][:90]) for x in skip]
