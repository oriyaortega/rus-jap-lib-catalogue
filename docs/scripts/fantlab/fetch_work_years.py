"""Fetch creation years of works from the Fantlab API into inbox/work_years.json ({fantlab_id: year|null}).
Usage: python fetch_work_years.py <catalog.json>"""
import json, os, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'inbox', 'work_years.json')
cat = json.load(open(sys.argv[1], encoding='utf-8'))
res = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}
ids = [str(w['fantlab']) for w in cat['works'] if w.get('fantlab') and str(w['fantlab']) not in res]
for n, fid in enumerate(ids, 1):
    for attempt in range(3):
        try:
            d = json.load(urllib.request.urlopen(urllib.request.Request(f'https://api.fantlab.ru/work/{fid}', headers={'User-Agent': 'jlit-catalog-prototype/0.1'}), timeout=30))
            res[fid] = d.get('work_year_of_write') or d.get('work_year') or None
            break
        except Exception as e:
            print(fid, e, file=sys.stderr, flush=True)
            time.sleep(5 * (attempt + 1))
    if n % 50 == 0:
        json.dump(res, open(OUT, 'w', encoding='utf-8'), indent=0)
        print(n, 'of', len(ids), flush=True)
    time.sleep(0.4)
json.dump(res, open(OUT, 'w', encoding='utf-8'), indent=0)
print('done', len(res), 'with year', sum(1 for v in res.values() if v))
