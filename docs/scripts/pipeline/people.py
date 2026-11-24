"""Person registry shared by the import stages: name normalisation, matching and id generation."""
import re

CYR = re.compile('[А-Яа-яЁё]')
JA = re.compile('[぀-ヿ㐀-鿿豈-﫿]')

GIVEN = set('''вера ирина анна татьяна елена екатерина григорий дмитрий александр борис аркадий николай владимир владислав виктор
надежда галина евгения нина ольга мария наталья наталия сергей андрей елизавета полина светлана юлия максим михаил зинаида нисон
коринна майя маргарита юрий иван константин петр пётр лев евгений алина тамара игорь василий всеволод вадим анастасия людмила
софья лидия алексей павел роман илья олег кирилл денис артем артём федор фёдор ксения дарья валентина валерия любовь эмилия
родион беата владимир михаил оскар лиана ирма раиса антон глеб степан виталий леонид жанна инна вероника регина лариса
рут нелли кристофер чарльз вадим даниэль китя бет наоми лен майк рут вадим'''.split())

TRANSLIT = dict(zip('абвгдеёжзийклмнопрстуфхцчшщъыьэюя',
                    ['a','b','v','g','d','e','e','zh','z','i','y','k','l','m','n','o','p','r','s','t','u','f','kh','ts','ch','sh','sch','','y','','e','yu','ya']))


def fold(s):
    s = (s or '').lower().replace('ё', 'е')
    return re.sub(r'[^\w\s-]', ' ', s).strip()


def translit(s):
    return ''.join(TRANSLIT.get(c, c if c.isascii() and c.isalnum() else '') for c in fold(s).replace(' ', '').replace('-', ''))


def is_initial(w):
    return bool(re.fullmatch(r'([А-ЯЁA-Z]\.)+', w))


def is_patronymic(w):
    return bool(re.search(r'(ович|евич|ич|овна|евна|ична|инична)$', w.lower())) and len(w) > 5


def strip_paren(s):
    """'Ихара Сайкаку (井原西鶴)' -> ('Ихара Сайкаку', '井原西鶴', latin)"""
    m = re.match(r'^(.*?)\s*\((.*)\)\s*$', s.strip())
    if not m:
        return s.strip(), None, None
    inner = m.group(2)
    ja = next((p.strip() for p in re.split(r'[/,]', inner) if JA.search(p)), None)
    lat = next((p.strip() for p in re.split(r'[/,]', inner) if re.search('[A-Za-z]', p) and not JA.search(p)), None)
    return m.group(1).strip(), ja, lat


def fix_latin(s):
    """Latin look-alikes inside Cyrillic words ('Иcии' with a Latin c)."""
    return re.sub(r'(?<=[А-Яа-яЁё])[cCeEoOaApPxX](?=[А-Яа-яЁё])|(?<=[А-Яа-яЁё])[cCeEoOaApPxX]\b|\b[cCeEoOaApPxX](?=[А-Яа-яЁё])',
                  lambda m: dict(zip('cCeEoOaApPxX', 'сСеЕоОаАрРхХ'))[m.group(0)], s or '')


def core_words(name):
    """Words of a Russian name without initials, patronymic or parenthesised parts.
    A patronymic is dropped only in a three-word name (Фамилия Имя Отчество / Имя Отчество Фамилия),
    so surnames like «Санович» survive."""
    name = fix_latin(re.sub(r'\(.*?\)', ' ', name).replace('\xa0', ' '))
    ws = [w for w in re.split(r'[\s,]+', name.strip()) if w and not is_initial(w)]
    if len(ws) == 3:
        if is_patronymic(ws[1]):
            ws = [ws[0], ws[2]]
        elif is_patronymic(ws[2]):
            ws = ws[:2]
    return ws


def genitive_to_nom(surname):
    s = surname
    for a, b in (('овой', 'ова'), ('евой', 'ева'), ('ёвой', 'ёва'), ('иной', 'ина'), ('ыной', 'ына'), ('ской', 'ская'), ('цкой', 'цкая'),
                 ('ского', 'ский'), ('цкого', 'цкий')):
        if s.endswith(a):
            return s[: -len(a)] + b
    for a, b in (('ова', 'ов'), ('ева', 'ев'), ('ёва', 'ёв'), ('ина', 'ин'), ('ына', 'ын')):
        if s.endswith(a):
            return s[: -len(a)] + b
    return s


def split_ru_name(name, order='auto'):
    """Return (surname, given) for a Russian/European name written in either order."""
    ws = core_words(name)
    if len(ws) == 1:
        return ws[0], ''
    if not ws:
        return name.strip(), ''
    a, b = ws[0], ws[-1]
    if order == 'eastern':
        return a, ' '.join(ws[1:])
    if order == 'western':
        return b, ' '.join(ws[:-1])
    fa, fb = fold(a), fold(b)
    if fa in GIVEN and fb not in GIVEN:
        return b, ' '.join(ws[:-1])
    if fb in GIVEN and fa not in GIVEN:
        return a, ' '.join(ws[1:])
    sur = re.compile(r'(ов|ев|ин|ын|ова|ева|ина|ына|ский|ская|цкий|цкая|ко|енко|ук|юк|як|ич|ман|ер|берг|штейн)$')
    if sur.search(fb) and not sur.search(fa):
        return b, ' '.join(ws[:-1])
    return a, ' '.join(ws[1:])


class Registry:
    def __init__(self, kind):
        self.kind = kind
        self.people = {}
        self.index = {}

    def keys_for(self, p):
        ks = []
        if p.get('name_orig') and JA.search(p['name_orig']):
            ks.append('k:' + re.sub(r'\s', '', p['name_orig']))
        ws = [fold(w) for w in core_words(p['name_ru'])]
        if len(ws) >= 2:
            ks.append('w:' + '|'.join(sorted(ws)))
        elif len(ws) == 1 and not re.search(r'[А-ЯЁ]\.', p['name_ru']):
            ks.append('n:' + ws[0])
        if p.get('sort'):
            given = p['name_ru'].replace(p['sort'], '').strip()
            gi = fold(given)[:1]
            if gi:
                ks.append('s:' + fold(p['sort']) + '|' + gi)
        return ks

    def add(self, p):
        base = p.get('id') or translit(p['sort'] + (p['name_ru'].replace(p['sort'], '')[:6]))[:24] or 'p'
        pid, n = base, 2
        while pid in self.people:
            pid, n = f'{base}{n}', n + 1
        p['id'] = pid
        self.people[pid] = p
        for k in self.keys_for(p):
            self.index.setdefault(k, pid)
        return p

    def find(self, name_ru=None, kanji=None, surname=None, initial=None):
        if kanji:
            pid = self.index.get('k:' + re.sub(r'\s', '', kanji))
            if pid:
                return self.people[pid]
        if name_ru:
            ws = [fold(w) for w in core_words(name_ru)]
            if len(ws) >= 2:
                pid = self.index.get('w:' + '|'.join(sorted(ws)))
                if pid:
                    return self.people[pid]
            elif len(ws) == 1 and not re.search(r'[А-ЯЁ]\.', name_ru):
                pid = self.index.get('n:' + ws[0])
                if pid:
                    return self.people[pid]
        if surname and initial:
            pid = self.index.get('s:' + fold(surname) + '|' + fold(initial)[:1])
            if pid:
                return self.people[pid]
        if surname and not initial:
            cands = [k for k in self.index if k.startswith('s:' + fold(surname) + '|')]
            if len(cands) == 1:
                return self.people[self.index[cands[0]]]
        return None

    def reindex(self, p):
        for k in self.keys_for(p):
            self.index.setdefault(k, p['id'])
