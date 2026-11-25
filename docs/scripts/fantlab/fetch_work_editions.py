# Скачивает с Фантлаба карточки произведений каталога (api.fantlab.ru/work/<id>/extended)
# в папку out_dir: <id>.json. Уже скачанные пропускает. Пауза между запросами — 0,4 с.
# Запуск: python fetch_work_editions.py data/catalog.json <out_dir> [--reverse]
# С --reverse идёт с конца списка: можно запустить вторую копию навстречу первой.
import json, os, sys, time, urllib.request
cat, out = sys.argv[1], sys.argv[2]
H = {'User-Agent': 'jlit-catalog/0.1'}
ids = [w['fantlab'] for w in json.load(open(cat, encoding='utf-8'))['works'] if w.get('fantlab')]
if '--reverse' in sys.argv: ids.reverse()
os.makedirs(out, exist_ok=True)
for i, fid in enumerate(ids):
    p = os.path.join(out, f'{fid}.json')
    if os.path.exists(p): continue
    for attempt in range(3):
        try:
            data = urllib.request.urlopen(urllib.request.Request(f'https://api.fantlab.ru/work/{fid}/extended', headers=H), timeout=30).read()
            json.loads(data)
            open(p, 'wb').write(data)
            break
        except Exception as e:
            print(fid, 'ERR', e, flush=True); time.sleep(3)
    if i % 50 == 0: print(i, '/', len(ids), flush=True)
    time.sleep(0.4)
print('done')
