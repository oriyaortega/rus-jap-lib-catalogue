"""Point the catalog's pictures to the local copies in <project>/images (list: images/_index.csv).
Run by import_all.py as the last step (exec with `cat` and `PROJECT` in scope), or standalone:
python localize_images.py <catalog.json> <project dir>
Original addresses are kept: cover_src / image_src."""
import csv, json, os, sys

if __name__ == '__main__':
    cat = json.load(open(sys.argv[1], encoding='utf-8'))
    PROJECT = sys.argv[2]

idx = {}
with open(os.path.join(PROJECT, 'images', '_index.csv'), encoding='utf-8-sig') as f:
    for row in csv.DictReader(f):
        idx[row['id в каталоге']] = (row['файл'], row['откуда'])

n = 0
for b in cat['books']:
    if b.get('cover') and b['id'] in idx and os.path.exists(os.path.join(PROJECT, 'images', idx[b['id']][0])):
        b['cover_src'] = b.get('cover_src') or b['cover']
        b['cover'] = 'images/' + idx[b['id']][0]
        n += 1
    for i, e in enumerate(b.get('editions') or []):
        k = f"{b['id']}-ed{i + 1}"
        if e.get('cover') and k in idx:
            e['cover_src'] = e.get('cover_src') or e['cover']
            e['cover'] = 'images/' + idx[k][0]
            n += 1
for p in cat['authors'] + cat['translators']:
    if p['id'] in idx and os.path.exists(os.path.join(PROJECT, 'images', idx[p['id']][0])):
        p['image_src'] = p.get('image_src') or p.get('image') or idx[p['id']][1]
        p['image'] = 'images/' + idx[p['id']][0]
        n += 1
print('localized pictures:', n)

if __name__ == '__main__':
    json.dump(cat, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
