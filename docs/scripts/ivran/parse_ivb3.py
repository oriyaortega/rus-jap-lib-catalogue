import re,html,json,glob
def clean(x): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>','',x))).strip()
def people(x): return [clean(n) for i,n in re.findall(r"authors\?id=(\d+)'>(.*?)</a>",x)]
ids=open('ivb_ids2.txt').read().split()
out={}
for bid in ids:
    s=open(f'dl_ivb/b{bid}.htm',encoding='utf-8').read()
    c=s[s.find('<div id="content">'):s.find('<!-- #content-->')]
    h1=re.search(r'<h1><a[^>]*>(.*?)</a></h1>',c,re.S)
    if not h1: continue
    pre=c[:h1.start()]; post=c[h1.end():]
    img=re.search(r'class="highslide"[^>]*href="([^"]+)"',c)
    auth=[]
    for p in re.findall(r'<p>(.*?)</p>',pre,re.S): auth+=people(p)
    # contents (hidden p)
    cont=None
    m=re.search(r'<p><u>Содержание</u></p></a><p style="display:none;">(.*?)</p>',post,re.S)
    if m: cont=m.group(1); post=post[:m.start()]+post[m.end():]
    roles=[];pubs=[];imprint=None;isbn=None;ann=[]
    for p in re.findall(r'<p[^>]*>(.*?)</p>',post,re.S):
        t=clean(p)
        if not t or t=='Содержание': continue
        if 'publishing?id=' in p: pubs=[clean(a) for a in re.findall(r'<a href="/publishing[^>]*>(.*?)</a>',p)]
        elif t.startswith('ISBN'): isbn=t.split(':',1)[1].strip() if ':' in t else t[4:].strip()
        elif imprint is None and re.match(r'^[^,]{2,60},\s*\d{4}',t): imprint=t
        elif "authors?id=" in p and re.match(r'^[^:]{3,40}:',t):
            for part in re.split(r'<br\s*/?>',p):
                mm=re.match(r'\s*(.*?):(.*)',part,re.S)
                if mm and people(mm.group(2)): roles.append((clean(mm.group(1)),people(mm.group(2))))
        else: ann.append(t)
    im=re.match(r'^(.*?),\s*(\d{4})(?:,\s*(\d+)\s*стр)?',imprint or '')
    out[bid]={'ivb':int(bid),'title':clean(h1.group(1)),'authors':auth,'roles':roles,'pubs':pubs,'city':im.group(1) if im else None,'year':int(im.group(2)) if im else None,'pages':int(im.group(3)) if im and im.group(3) else None,'imprint':imprint,'isbn':isbn,'ann':' '.join(ann),'contents':clean(re.sub(r'<br\s*/?>','\n',cont)) if cont else None,'cover':('https://book.ivran.ru'+img.group(1)) if img else None}
json.dump(out,open('ivb_books.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print(len(out))
