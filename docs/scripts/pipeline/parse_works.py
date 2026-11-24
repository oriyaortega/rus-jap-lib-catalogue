"""Parse the saved Fantlab advanced-search page (country = Japan) into works.json.
Each result = one or more author <p> (margin-left:29px) followed by a work <p> (margin-left:49px)."""
import re, json, html as H

src = open('mh.html', encoding='utf-8').read()
body = src[src.find('search-results'):]
ps = re.findall(r'<p style="margin-left:(\d+)px[^"]*">(.*?)</p>', body, re.S)

CYR = re.compile('[А-Яа-яЁё]')
JA = re.compile('[぀-ヿ㐀-鿿]')

def clean(s):
    return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', '', s))).strip()

works, pending = [], []
for margin, inner in ps:
    if margin == '29':
        m = re.search(r'autor(\d+)', inner)
        pending.append({'fl': int(m.group(1)) if m else None, 'name': clean(inner)})
    elif margin == '49':
        m = re.search(r'work(\d+)', inner)
        b = re.search(r'<b>(.*?)</b>', inner, re.S)
        alt = re.search(r'<font color="gray">\[=\s*(.*?)\]</font>', inner, re.S)
        kind = re.search(r'</a>\s*\(([^)]*(?:\([^)]*\))?[^)]*)\)\s*$', inner.strip(), re.S)
        works.append({'fl_work': int(m.group(1)) if m else None, 'authors': pending,
                      'title': clean(b.group(1)) if b else clean(inner),
                      'alt': clean(alt.group(1)) if alt else None,
                      'kind': clean(kind.group(1)) if kind else None})
        pending = []

def split_title(t):
    parts = [p.strip() for p in t.split(' / ')]
    ru = next((p for p in parts if CYR.search(p)), None)
    ja = next((p for p in parts if JA.search(p) and not CYR.search(p)), None)
    rom = next((p for p in parts if p not in (ru, ja) and re.search('[A-Za-z]', p)), None)
    return ru, ja, rom

out = []
for w in works:
    ru, ja, rom = split_title(w['title'])
    if not ru and w['alt'] and CYR.search(w['alt']):
        ru = w['alt']
    w.update(title_ru=ru, title_orig=ja, title_romaji=rom)
    out.append(w)

json.dump(out, open('works.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
tr = [w for w in out if w['title_ru']]
print('works', len(out), 'with russian title', len(tr))
import collections
print(collections.Counter(w['kind'] for w in tr).most_common(30))
names = collections.Counter(a['name'] for w in tr for a in w['authors'])
print(len(names)); print(names.most_common(100))
