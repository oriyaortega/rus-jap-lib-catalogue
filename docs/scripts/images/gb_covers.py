"""Look up covers on Google Books for catalog books without a cover.
Usage: python gb_covers.py <catalog.json> <out.json>
Match by ISBN; without ISBN, by title + year (same year, title starts the same)."""
import json, re, sys, time, urllib.parse, urllib.request

UA = {'User-Agent': 'jp-lit-catalog-script/1.0'}


def get(url):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return json.load(r)
        except Exception:
            time.sleep(3 + 4 * i)
    return None


def norm(s):
    return re.sub(r'[^0-9a-zа-я]', '', (s or '').lower().replace('ё', 'е'))


cat = json.load(open(sys.argv[1], encoding='utf-8'))
A = {a['id']: a['name_ru'] for a in cat['authors']}
res = {}
for b in cat['books']:
    if b.get('cover'):
        continue
    isbn = re.sub(r'[^0-9Xx]', '', b.get('isbn') or '')
    found = None
    if len(isbn) in (10, 13):
        d = get('https://www.googleapis.com/books/v1/volumes?' + urllib.parse.urlencode({'q': 'isbn:' + isbn}))
        for it in (d or {}).get('items', []):
            v = it['volumeInfo']
            if v.get('imageLinks'):
                found = {'how': 'isbn', 'gb': it['id'], 'title': v.get('title'), 'date': v.get('publishedDate'),
                         'img': v['imageLinks'].get('thumbnail')}
                break
    if not found:
        q = 'intitle:' + b['title_ru'].split('.')[0][:60]
        if b['authors']:
            q += ' inauthor:' + A.get(b['authors'][0], '').split()[0]
        d = get('https://www.googleapis.com/books/v1/volumes?' + urllib.parse.urlencode({'q': q, 'maxResults': 10}))
        for it in (d or {}).get('items', []):
            v = it['volumeInfo']
            if not v.get('imageLinks') or str(b['year']) != (v.get('publishedDate') or '')[:4]:
                continue
            t = norm(v.get('title'))
            if t and (t.startswith(norm(b['title_ru'])[:20]) or norm(b['title_ru']).startswith(t[:20])):
                found = {'how': 'title', 'gb': it['id'], 'title': v.get('title'), 'date': v.get('publishedDate'),
                         'img': v['imageLinks'].get('thumbnail')}
                break
    print(b['id'], bool(found), flush=True)
    if found:
        res[b['id']] = found
    time.sleep(0.5)
json.dump(res, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('found', len(res))
