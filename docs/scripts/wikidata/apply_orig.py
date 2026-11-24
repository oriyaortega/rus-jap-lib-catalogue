"""Set authors' name_orig to the name in the original language.
Japanese (and Chinese) authors: the name in characters; others: native-language or Latin name;
Russian authors: null (the card shows the Russian name).
Runs standalone (python apply_orig.py <catalog in> <catalog out>) or via exec() from import_all.py with `cat` defined."""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CJK = re.compile('[㐀-鿿豈-﫿]')          # kanji / hanzi
KANA_ONLY = re.compile('^[぀-ヿ・ー\\s・＝=]+$')
LATIN = re.compile('[A-Za-zÀ-ž]')
JAPAN = {'Q17', 'Q188712', 'Q1048980', 'Q216615'}   # Japan, Empire of Japan, occupied Japan, Ryukyu Kingdom
RUSSIA = {'Q159', 'Q15180', 'Q34266', 'Q2305208', 'Q212', 'Q184', 'Q232'}  # RU, USSR, RU Empire, RSFSR, UA, BY, KZ
MANUAL = json.load(open(os.path.join(HERE, 'orig_manual.json'), encoding='utf-8')) if os.path.exists(os.path.join(HERE, 'orig_manual.json')) else {}


def original(a, info):
    if a['id'] in MANUAL:
        return MANUAL[a['id']]
    cur = a.get('name_orig')
    if cur and CJK.search(cur):
        return cur
    if not info:
        return cur
    ja, en, nat, lang, country = info.get('ja'), info.get('en'), info.get('native'), info.get('lang'), set(info.get('country') or [])
    if ja and CJK.search(ja) and (country & JAPAN or lang == 'ja' or not country or 'Q148' in country or 'Q865' in country):
        return ja
    if country & RUSSIA or lang == 'ru':
        return cur
    if nat and not re.search('[А-Яа-яЁё]', nat):
        return nat
    if en and LATIN.search(en):
        return en
    return cur


def apply(cat, res):
    changed = 0
    for a in cat['authors']:
        new = original(a, res.get(a['id']))
        if new != a.get('name_orig'):
            a['name_orig'] = new
            changed += 1
    return changed


_res = json.load(open(os.path.join(HERE, 'inbox', 'orig_names.json'), encoding='utf-8'))
if __name__ == '__main__':
    cat = json.load(open(sys.argv[1], encoding='utf-8'))
    print('changed', apply(cat, _res))
    json.dump(cat, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
else:
    print('orig names changed', apply(cat, _res))
