"""Download every picture the site shows into one folder.
Covers (books and other editions), own portraits, and Wikidata portraits (P18, 240px like the site).
Usage: python dl_images.py <catalog.json> <out_dir>
Writes <out_dir>/_index.csv: file, kind, id, title/name, source URL."""
import csv, json, os, sys, time, urllib.parse, urllib.request

cat = json.load(open(sys.argv[1], encoding='utf-8'))
out = sys.argv[2]
os.makedirs(out, exist_ok=True)
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) jlit-catalog/0.1'}
EXT = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg'}

items = []
for b in cat['books']:
    if b.get('cover'):
        items.append(('обложка', b['id'], b['title_ru'], b['cover']))
    for i, e in enumerate(b.get('editions') or []):
        if e.get('cover'):
            items.append(('обложка другого издания', f"{b['id']}-ed{i + 1}", f"{b['title_ru']} ({e.get('year')})", e['cover']))
people = cat['authors'] + cat['translators']
for p in people:
    if p.get('image'):
        items.append(('портрет', p['id'], p['name_ru'], p['image']))

# Wikidata portraits: P18 of every person with a QID
qids = sorted({p['wikidata'] for p in people if p.get('wikidata')})
p18 = {}
for i in range(0, len(qids), 50):
    u = 'https://www.wikidata.org/w/api.php?' + urllib.parse.urlencode(
        {'action': 'wbgetentities', 'ids': '|'.join(qids[i:i + 50]), 'props': 'claims', 'format': 'json'})
    d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60))
    for q, e in d.get('entities', {}).items():
        c = e.get('claims', {}).get('P18')
        if c:
            p18[q] = c[0]['mainsnak']['datavalue']['value']
    time.sleep(0.5)
seen_q = set()
for p in people:
    q = p.get('wikidata')
    if q in p18 and not p.get('image') and q not in seen_q:
        seen_q.add(q)
        items.append(('портрет (Викиданные)', p['id'], p['name_ru'],
                      'https://commons.wikimedia.org/wiki/Special:FilePath/' + urllib.parse.quote(p18[q]) + '?width=240'))

rows, failed = [], []
for kind, pid, name, url in items:
    full = 'https:' + url if url.startswith('//') else url
    prefix = {'обложка': 'cover', 'обложка другого издания': 'cover', 'портрет': 'person', 'портрет (Викиданные)': 'person'}[kind]
    base = f'{prefix}_{pid}'
    have = [f for f in os.listdir(out) if f.rsplit('.', 1)[0] == base]
    if have:
        rows.append((have[0], kind, pid, name, full))
        continue
    for attempt in range(3):
        try:
            r = urllib.request.urlopen(urllib.request.Request(urllib.parse.quote(full, safe=':/?&=%#+,;@'), headers=UA), timeout=40)
            ct = r.headers.get_content_type()
            data = r.read()
            if not ct.startswith('image/') or len(data) < 200:
                raise ValueError(f'not an image ({ct}, {len(data)} bytes)')
            fn = base + EXT.get(ct, '.' + ct.split('/')[-1])
            open(os.path.join(out, fn), 'wb').write(data)
            rows.append((fn, kind, pid, name, full))
            break
        except Exception as e:
            err = str(e)
            time.sleep(2 * (attempt + 1))
    else:
        failed.append((kind, pid, name, full, err))
    time.sleep(0.15)

with open(os.path.join(out, '_index.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(['файл', 'что', 'id в каталоге', 'название / имя', 'откуда'])
    w.writerows(rows)
json.dump(failed, open(os.path.join(out, '_failed.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('total', len(items), 'saved', len(rows), 'failed', len(failed))
for x in failed[:30]:
    print('FAIL', x)
