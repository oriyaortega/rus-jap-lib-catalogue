"""Download LiveLib covers found in the browser and register them.
Usage: python apply_ll_covers.py <results.json> <project dir>
results.json: {book_id: {bid, hash, ok?} | null}; only entries with ok != False are used."""
import csv, json, os, sys, time, urllib.request

res = json.load(open(sys.argv[1], encoding='utf-8'))
P = sys.argv[2]
img_dir = os.path.join(P, 'images')
cat = json.load(open(os.path.join(P, 'data', 'catalog.json'), encoding='utf-8'))
B = {b['id']: b for b in cat['books']}
have = {r['id в каталоге'] for r in csv.DictReader(open(os.path.join(img_dir, '_index.csv'), encoding='utf-8-sig'))}
fx = json.load(open('demo_fixes.json', encoding='utf-8'))
rows, n = [], 0
for bid_, r in res.items():
    if not r or isinstance(r, str) or r.get('ok') is False or bid_ in have or B[bid_].get('cover'):
        continue
    url = f"https://s1.livelib.ru/boocover/{r['bid']}/200x305/{r['hash']}/boocover.jpg"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.livelib.ru/'})
        data = urllib.request.urlopen(req, timeout=30).read()
    except Exception as e:
        print('fail', bid_, e)
        continue
    if len(data) < 3000 or not data[:3] == b'\xff\xd8\xff':
        print('skip (not a jpeg cover)', bid_, len(data))
        continue
    fn = f'cover_{bid_}.jpg'
    open(os.path.join(img_dir, fn), 'wb').write(data)
    rows.append(','.join([fn, 'обложка', bid_, '"' + B[bid_]['title_ru'].replace('"', '') + '"', url]))
    e = fx.setdefault(bid_, {})
    e['cover'] = url
    links = e.setdefault('links', B[bid_].get('links') or [])
    lu = f"https://www.livelib.ru/book/{r['bid']}"
    if not any(l['url'] == lu for l in links):
        links.append({'name': 'LiveLib', 'url': lu})
    n += 1
    time.sleep(0.4)
with open(os.path.join(img_dir, '_index.csv'), 'a', encoding='utf-8', newline='') as f:
    f.write('\n'.join(rows) + ('\n' if rows else ''))
json.dump(fx, open('demo_fixes.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('covers added', n)
