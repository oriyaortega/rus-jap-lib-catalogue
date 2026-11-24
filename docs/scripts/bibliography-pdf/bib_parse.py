import re, json
D='SCRATCH/bib/'
CAND=re.compile(r'^(\d{1,5})(а|a)?\.?\s+(.*)')
KEEP_PREF=('русско','японо','англо','франко','германо','американо','военно','социал','северо','юго','северо','восточно','западно','научно','общественно','историко','литературно','художественно','торгово','промышленно','финансово','экономико','политико','культурно','морско','сухопутно','лево','право','ново','старо','дальне','средне','полу','пол','мелко','крупно','церковно','государственно','административно','советско','китайско','корейско','монголо','маньчжуро','австро','итало','испано','голландско','немецко','русско','японско','иностранно','физико','медико','санитарно','инженерно','статистико','военно','морской','военно','народно','национально','общественно','социально','учебно','научно','справочно','библиографическо','мирово','кредитно','денежно','гидро','этно','фото','кино','радио','авиа','электро','авто','нефте','газо','энерго','лесо','рыбо','хлопко','шелко')
def dehy(t):
    def r(m):
        a,b=m.group(1),m.group(2)
        if b[:1].isupper() or a.lower().endswith(KEEP_PREF) or b in ('на','де','ди','ла','ле') or a[-1:].isupper(): return a+'-'+b
        return a+b
    return re.sub(r'([А-Яа-яЁё]+)-\u00ad([А-Яа-яЁё]+)',r,t).replace('\u00ad','')
def load(name):
    out=[]; page=0
    for ln in open(D+name,encoding='utf-8').read().split('\n'):
        s=ln.strip()
        if s.startswith('=====PAGE'): page=int(s.split()[1].strip('=')); continue
        if s: out.append((page,s))
    return out
def is_cand(s):
    m=CAND.match(s)
    if not m: return None
    rest=m.group(3)
    if not re.match(r'[«"„(\[А-ЯЁA-Z]',rest): return None
    if re.match(r'(с|стр)\.',rest): return None
    return int(m.group(1)), rest
SP=re.compile(r'^(?:[А-ЯЁ](?:\s+[а-яё]){1,}|[А-ЯЁ][а-яё]?(?:\s+[а-яё])+)(?:\s+[А-ЯЁ](?:\s+[а-яё])*)*\s*\.?\s*\*?$')
DATES=re.compile(r'^\(?\s*(?:род\.\s*в\s*)?(?:\d{3,4}|\?)\s*(?:г\.)?\s*(?:[—-]\s*(?:\d{3,4})?\s*(?:г\.)?)?\s*\)?\s*\*?$')
def spaced(s):
    toks=s.replace('*','').split()
    if len(toks)<3 or sum(len(t)==1 for t in toks)<len(toks)*0.6: return None
    if not SP.match(s): return None
    w=re.sub(r'\s+','',s.replace('*','')).rstrip('.')
    return re.sub(r'(?<=[а-яё])(?=[А-ЯЁ])',' ',w)
PLAIN=re.compile(r'^[А-ЯЁ][а-яё]+(?:[-‑][А-ЯЁа-яё][а-яё]+)?(?:\s+[А-ЯЁ][а-яё]+(?:[-‑][а-яё]+)?){0,2}\s*\*?$')
def entries(name):
    L=load(name)
    cands=[(i,)+c for i,(p,s) in enumerate(L) for c in [is_cand(s)] if c]
    acc=set(); last=0
    for k,(i,n,rest) in enumerate(cands):
        nxt=[c[1] for c in cands[k+1:k+4]]
        if last < n <= last+25 and (len(nxt)<1 or nxt[0]>n or n==last+1):
            acc.add(i); last=n
        elif n>last and len(nxt)>=2 and nxt[0]==n+1 and nxt[1]==n+2 and n-last<400:
            acc.add(i); last=n
        elif n==last and re.match(r'^\d+(а|a)\.',L[i][1]):
            acc.add(i)
    out=[]; cur=None; section=[]; head=None; headbuf=[]; lastkind=None
    for i,(p,s) in enumerate(L):
        kind=None
        if i in acc:
            n,rest=is_cand(s)
            if headbuf: head=' '.join(headbuf); headbuf=[]
            cur={'n':n,'page':p,'text':rest,'jp':head,'ln':i}; out.append(cur); lastkind=None; continue
        sp=spaced(s)
        prev=L[i-1][1] if i else ''
        nxt=L[i+1][1] if i+1<len(L) else ''
        def addh(x):
            nonlocal_headbuf=None
        if sp:
            if lastkind!='h': headbuf=[]
            headbuf.append(sp); cur=None; lastkind='h'; continue
        if lastkind=='h' and DATES.match(s): continue
        nxt2=L[i+2][1] if i+2<len(L) else ''
        if PLAIN.match(s) and len(s)>2 and ((i+1) in acc or (lastkind=='h') or (re.search(r'[.)\d»;!?]\s*$',prev) and (PLAIN.match(nxt) or DATES.match(nxt) or spaced(nxt))) or (PLAIN.match(nxt) and (i+2) in acc) or (DATES.match(nxt) and (i+2) in acc)):
            if lastkind!='h': headbuf=[]
            headbuf.append(s.replace('*','').strip()); cur=None; lastkind='h'; continue
        lastkind=None
        if len(s)>=8 and s.upper()==s and re.search('[А-ЯЁ]{4}',s) and not re.search(r'\d{4}',s) and not s.startswith('[') and not s.rstrip().endswith((',','—','-')) and not re.search(r'[«»]',s):
            head=None; headbuf=[]; cur=None; continue
        if re.fullmatch(r'[\d\s;:.,\'"«»*<>]+',s): continue
        if cur:
            cur['text']+=('\u00ad' if cur['text'].endswith('-') else ' ')+s
    for e in out:
        t=re.sub(r'[ \t]+',' ',e['text'])
        t=dehy(t.replace('-\u00ad','-\u00ad'))
        e['text']=t
    return out
if __name__=='__main__':
    for f in ['b1917','b1958','b1973']:
        es=entries(f+'.txt'); ns=[e['n'] for e in es]
        gaps=[(a,b) for a,b in zip(ns,ns[1:]) if b-a>1]
        print(f,len(es),ns[-1],'gaps',len(gaps),sum(b-a-1 for a,b in gaps), 'jp-headed',sum(1 for e in es if e['jp']))
        json.dump(es,open(D+f+'.json','w',encoding='utf-8'),ensure_ascii=False,indent=0)
