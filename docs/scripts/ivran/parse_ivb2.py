import re,html,json,glob,os
def clean(x): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>','',x))).strip()
def people(x): return [(int(i),clean(n)) for i,n in re.findall(r"authors\?id=(\d+)'>(.*?)</a>",x)]
out={}
for f in glob.glob('dl_ivb/b*.htm'):
    bid=re.search(r'b(\d+)\.htm',f).group(1)
    s=open(f,encoding='utf-8').read()
    c=s[s.find('<div id="content">'):s.find('<!-- #content-->')]
    h1=re.search(r'<h1><a[^>]*>(.*?)</a></h1>',c,re.S)
    pre=c[:h1.start()]; post=c[h1.end():]
    img=re.search(r'class="highslide"[^>]*href="([^"]+)"',c)
    auth=[]
    for p in re.findall(r'<p>(.*?)</p>',pre,re.S): auth+=people(p)
    roles=[];pubs=[];imprint=None;isbn=None;ann=[]
    for p in re.findall(r'<p>(.*?)</p>',post,re.S):
        t=clean(p)
        if not t: continue
        if 'publishing?id=' in p: pubs=[clean(a) for a in re.findall(r'<a href="/publishing[^>]*>(.*?)</a>',p)]
        elif t.startswith('ISBN'): isbn=t.split(':',1)[1].strip()
        elif imprint is None and re.match(r'^[^,]{2,40},\s*\d{4}',t): imprint=t
        elif re.match(r'^[А-ЯЁа-яё -]{3,40}:',t) and "authors?id=" in p:
            for part in re.split(r'<br\s*/?>',p):
                m=re.match(r'\s*([^:<]+):(.*)',part,re.S)
                if m: roles.append((m.group(1).strip(),[n for _,n in people(m.group(2))]))
        else: ann.append(t)
    out[bid]={'ivb':int(bid),'title':clean(h1.group(1)),'authors':[n for _,n in auth],'roles':roles,'pubs':pubs,'imprint':imprint,'isbn':isbn,'ann':' '.join(ann),'cover':('https://book.ivran.ru'+img.group(1)) if img else None}
json.dump(out,open('ivb_books.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
for b in sorted(out.values(),key=lambda b:b['ivb']):
    print(b['ivb'],'|',b['title'][:70],'|',b['authors'],'|',[(r,n) for r,n in b['roles']][:3],'|',b['pubs'],'|',b['imprint'],'|',b['isbn'],'| ann',len(b['ann']))
