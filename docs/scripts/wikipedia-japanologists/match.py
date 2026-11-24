import json, re, urllib.parse
P = r'PROJECT'
c = json.load(open(P + '/data/catalog.json', encoding='utf-8'))
f = lambda s: (s or '').lower().replace('ё', 'е').strip()
def parse_name(s):
    s = re.sub(r'\s*\(.*?\)', '', s)                       # (Аболтин), (годы)
    m = re.match(r'([А-ЯЁ][^,]+?),\s*([А-ЯЁ][а-яё\-]+)(?:\s+([А-ЯЁ][а-яё\-]+))?', s)
    if m: return m.group(1).strip(), m.group(2), m.group(3)
    if re.search(r'см\.|Библиограф|Востоковеды|Книги о|Ассоциация|и др\.|Список', s): return None
    m = re.match(r'([А-ЯЁ][а-яё\-]+(?:\s[А-ЯЁ][а-яё\-]+)?),?\s+([А-ЯЁ])\.\s*(?:([А-ЯЁ])\.)?', s)
    if m: return m.group(1), m.group(2) + '.', (m.group(3) + '.') if m.group(3) else None
    m = re.match(r'([А-ЯЁ][а-яё\-]+)\s+([А-ЯЁ][а-яё\-]+)$', s.split(',')[0].strip())
    if m: return m.group(1), m.group(2), None
    return None
idx = {}
for kind, L in (('a', c['authors']), ('t', c['translators'])):
    for p in L:
        for nm in filter(None, [p.get('full_name'), p['name_ru']]):
            ws = nm.replace(',', ' ').split()
            if not ws: continue
            sur = f(ws[0]); rest = ws[1:]
            given = [w for w in rest if not re.fullmatch(r'[А-ЯЁ]\.', w)]
            inits = ''.join(w[0] for w in rest)
            idx.setdefault(sur, []).append((kind, p['id'], [f(g) for g in given], inits.upper()))
def lookup(sur, g, pat):
    out = []
    for kind, pid, given, inits in idx.get(f(sur), []):
        if g.endswith('.'):
            fi = (given[0][:1].upper() if given else inits[:1])
            if fi == g[0] and (not pat or len(given) < 2 and len(inits) < 2 or (given[1][:1].upper() if len(given) > 1 else inits[1:2]) == pat[0]): out.append((kind, pid))
        elif given:
            if f(g) == given[0] and (len(given) < 2 or not pat or f(pat) == given[1]): out.append((kind, pid))
        elif inits and inits[0] == g[0] and (len(inits) < 2 or not pat or inits[1] == pat[0]): out.append((kind, pid))
    return out
people = json.load(open('list.json', encoding='utf-8'))
cats = json.load(open('cats.json', encoding='utf-8'))
persons = {}
for p in people:
    n = parse_name(p['head'])
    if not n: print('?', p['head'][:60]); continue
    title = urllib.parse.unquote(p['href'].split('/wiki/')[-1]).replace('_', ' ') if p['href'] and '/wiki/' in p['href'] else None
    persons[(f(n[0]), f(n[1]), f(n[2] or ''))] = {'sur': n[0], 'given': n[1], 'pat': n[2], 'head': p['head'], 'title': title, 'works': p['works'], 'cats': []}
for cat, titles in cats.items():
    for t in titles:
        n = parse_name(t)
        if not n: print('?cat', t); continue
        k = (f(n[0]), f(n[1]), f(n[2] or ''))
        persons.setdefault(k, {'sur': n[0], 'given': n[1], 'pat': n[2], 'head': t, 'title': t, 'works': [], 'cats': []})
        persons[k]['cats'].append(cat); persons[k]['title'] = persons[k]['title'] or t
found = miss = 0
for k, p in persons.items():
    p['match'] = lookup(p['sur'], p['given'], p['pat'])
    if p['match']: found += 1
    else: miss += 1
json.dump(list(persons.values()), open('persons.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('persons', len(persons), 'in catalog', found, 'missing', miss)
print('ambiguous', [(p['sur'], p['given'], p['match']) for p in persons.values() if len(p['match']) > 1][:15])
import collections
print('missing with works', sum(1 for p in persons.values() if not p['match'] and p['works']), 'missing cat-only', sum(1 for p in persons.values() if not p['match'] and not p['works']))
