"""Merge bios/b*.json ({id: [bio, url]}) into author_fixes.json rename entries as bio + bio_src."""
import glob, json, re
from urllib.parse import urlparse

extra = {
    'richardsonmayk': ['Майк Ричардсон (род. 1950) — американский издатель, писатель и продюсер, основатель издательства комиксов Dark Horse Comics, автор графического романа «47 ронинов».', 'https://www.wikidata.org/wiki/Q3305753'],
}
wd_extra = {'richardsonmayk': 'Q3305753', 'danncharl': 'Q107657242'}

ivpages = json.load(open('iv_auth_pages.json', encoding='utf-8'))
bios = {}
for f in sorted(glob.glob('bios/b0[0-9].json')):
    bios.update(json.load(open(f, encoding='utf-8')))
bios.update(extra)
bios['anseyogita'][1] = 'https://kotobank.jp/search?q=荻田安静'


def src_name(u):
    h = urlparse(u).netloc.replace('www.', '')
    if h.endswith('wikipedia.org'):
        return {'ja': 'Википедия (яп.)', 'en': 'Википедия (англ.)', 'ru': 'Википедия', 'es': 'Википедия (исп.)'}.get(h.split('.')[0], 'Википедия')
    return {'wikidata.org': 'Викиданные', 'kotobank.jp': 'Котобанк', 'ivran.ru': 'сайт ИВ РАН', 'book.ivran.ru': 'каталог ИВ РАН',
            'ooh.ivran.ru': 'сайт ИВ РАН', 'lk.ivran.ru': 'сайт ИВ РАН', 'mgimo.ru': 'сайт МГИМО', 'hum.hse.ru': 'сайт НИУ ВШЭ',
            'iocs.hse.ru': 'сайт НИУ ВШЭ', 'letopis.msu.ru': 'Летопись МГУ', 'gaugn.ru': 'сайт ГАУГН', 'imwerden.de': 'библиотека ImWerden',
            'eo.iea.ras.ru': '«Этнографическое обозрение»', 'japanstudies.ru': 'Ассоциация японоведов', 'famous-scientists.ru': '«Известные учёные»',
            'editions-hazan.fr': 'издательство Hazan', 'history.ucsd.edu': 'сайт Калифорнийского университета', 'pmc.ncbi.nlm.nih.gov': 'PubMed Central',
            'tuttlepublishing.com': 'издательство Tuttle', 'youtube.com': 'NHK World (YouTube)', 'kaiseisha.co.jp': 'издательство Кайсэйся'}.get(h, h)


f = json.load(open('author_fixes.json', encoding='utf-8'))
ren = f['rename']
for aid, (bio, url) in bios.items():
    if url == 'https://book.ivran.ru/authors':
        url = ivpages[aid]['url']
    v = ren.get(aid)
    v = {'name_ru': v} if isinstance(v, str) else (v or {})
    v['bio'] = bio
    v['bio_src'] = {'name': src_name(url), 'url': url}
    if aid in wd_extra:
        v['wikidata'] = wd_extra[aid]
    ren[aid] = v
json.dump(f, open('author_fixes.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('bios merged', len(bios))
