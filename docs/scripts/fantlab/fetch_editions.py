# Скачивает с Фантлаба карточки изданий (api.fantlab.ru/edition/<id>/extended) в папку out_dir: <id>.json.
# Номера изданий — публикации из data/work-editions.json, ещё не сопоставленные с книгами каталога (только книги, не журналы).
# Уже скачанные пропускает. Пауза между запросами — 0,4 с.
# Запуск: python fetch_editions.py data/work-editions.json <out_dir> [--reverse]
import json, os, sys, time, urllib.request
src, out = sys.argv[1], sys.argv[2]
H = {'User-Agent': 'jlit-catalog/0.1'}
ids = sorted({p['fl'] for w in json.load(open(src, encoding='utf-8')).values() for p in w['pubs'] if not p.get('book') and p['kind'] == 'книга'})
if '--reverse' in sys.argv: ids.reverse()
os.makedirs(out, exist_ok=True)
for i, fid in enumerate(ids):
    p = os.path.join(out, f'{fid}.json')
    if os.path.exists(p): continue
    for attempt in range(3):
        try:
            data = urllib.request.urlopen(urllib.request.Request(f'https://api.fantlab.ru/edition/{fid}/extended', headers=H), timeout=30).read()
            json.loads(data)
            open(p, 'wb').write(data)
            break
        except Exception as e:
            print(fid, 'ERR', e, flush=True); time.sleep(3)
    if i % 50 == 0: print(i, '/', len(ids), flush=True)
    time.sleep(0.4)
print('done')
