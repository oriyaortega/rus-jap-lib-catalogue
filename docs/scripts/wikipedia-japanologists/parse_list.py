import json, re
from html.parser import HTMLParser
VOID = {'br','img','hr','meta','link','input','wbr','source','area','col','embed','param','track'}
class N:
    def __init__(s, tag, attrs, parent): s.tag, s.attrs, s.parent, s.ch = tag, dict(attrs), parent, []
class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.root = N('root', [], None); s.cur = s.root
    def handle_starttag(s, t, a):
        n = N(t, a, s.cur); s.cur.ch.append(n)
        if t not in VOID: s.cur = n
    def handle_endtag(s, t):
        n = s.cur
        while n is not None and n.tag != t: n = n.parent
        if n is not None and n.parent is not None: s.cur = n.parent
    def handle_data(s, d): s.cur.ch.append(d)
p = P(); p.feed(open('list.html', encoding='utf-8').read())
def find(n, pred, out):
    for c in n.ch:
        if isinstance(c, N):
            if pred(c): out.append(c)
            find(c, pred, out)
    return out
def text(n, skip=('ul', 'ol', 'sup', 'style')):
    if isinstance(n, str): return n
    if n.tag in skip or 'mw-editsection' in n.attrs.get('class', ''): return ''
    return ''.join(text(c, skip) for c in n.ch)
cont = [n for n in find(p.root, lambda n: 'mw-parser-output' in (n.attrs.get('class') or ''), []) if n.tag == 'div'][0]
people = []
def kids(n, tag): return [c for c in n.ch if isinstance(c, N) and c.tag == tag]
for sec in find(p.root, lambda n: n.tag == 'section', []):
    for ul in kids(sec, 'ul'):
        for li in kids(ul, 'li'):
            a = next((c for c in li.ch if isinstance(c, N) and c.tag == 'a'), None)
            href = a.attrs.get('href') if a is not None and 'new' not in (a.attrs.get('class') or '') else None
            works = []
            for sub in kids(li, 'ul'):
                for w in kids(sub, 'li'):
                    works.append({'t': re.sub(r'\s+', ' ', text(w)).strip()})
                    for sub2 in kids(w, 'ul'):
                        for w2 in kids(sub2, 'li'):
                            works.append({'t': re.sub(r'\s+', ' ', text(w2)).strip(), 'sub': True})
            people.append({'head': re.sub(r'\s+', ' ', text(li)).strip(), 'href': href, 'works': works})
json.dump(people, open('list.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(people), sum(len(x['works']) for x in people))
print(people[2])
