import re,html,glob,json,sys
items={}
def clean(x): return html.unescape(re.sub(r'<[^>]+>','',x)).strip()
for f in sorted(glob.glob('dl_ivb/*.html')):
    s=open(f,encoding='utf-8').read()
    for m in re.finditer(r'<a href="/book\?id=(\d+)[^"]*"><img[^>]*src="([^"]+)"[^>]*/></a>(.*?)<div class=\'clearfix\'>',s,flags=re.S):
        bid,img,body=m.groups()
        title=clean(re.search(r'<h4>(.*?)</h4>',body,re.S).group(1))
        ps=[p for p in re.findall(r'<p>(.*?)</p>',body,re.S) if clean(p)]
        roles=[]
        pub=None; imprint=None
        for p in ps:
            if 'publishing?id=' in p: pub=clean(p)
            elif re.search(r'\d{4}',clean(p)) and 'стр' in clean(p) or re.match(r'^[^:]*,\s*\d{4}',clean(p)): imprint=clean(p)
            else:
                for part in re.split(r'<br\s*/?>',p):
                    mm=re.match(r'\s*([^:<]+):\s*(.*)',part,re.S)
                    if mm: roles.append((mm.group(1).strip(),[ (re.search(r'id=(\d+)',a).group(1),clean(a)) for a in re.findall(r"<a href='[^']*authors\?id=\d+'>.*?</a>",mm.group(2))] or clean(mm.group(2))))
        it=items.setdefault(bid,{'id':bid,'title':title,'img':'https://book.ivran.ru'+img if img.startswith('/') else img,'pub':pub,'imprint':imprint,'roles':roles,'pages_from':[]})
        it['pages_from'].append(f.split('\\')[-1].split('/')[-1])
json.dump(items,open('ivb_items.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print(len(items))
for it in items.values(): print(it['id'],'|',it['title'],'|',it['pub'],'|',it['imprint'],'|',[(r, [n for _,n in p] if isinstance(p,list) else p) for r,p in it['roles']],'|',','.join(x[:14] for x in it['pages_from']))
