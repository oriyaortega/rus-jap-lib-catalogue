import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()


def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (old[:70], s.count(old))
    s = s.replace(old, new)


# Е и Ё — разные буквы алфавита
rep("""  const collator = new Intl.Collator('ru', { sensitivity: 'base' });""",
    """  const collator = new Intl.Collator('ru', { sensitivity: 'base' });
  // Алфавитный порядок с Ё отдельной буквой после Е (Intl.Collator считает их одной)
  const ALPHABET = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
  const letterRank = (s) => { const i = ALPHABET.indexOf((s || '')[0]?.toUpperCase()); return i < 0 ? 99 : i; };
  const alphaCompare = (a, b) => letterRank(a) - letterRank(b) || collator.compare(a, b);
  const CJK = /[\\u3040-\\u30ff\\u3400-\\u9fff\\uf900-\\ufaff]/;""")

# имя в оригинале: кандзи — только CJK, orig — любое
rep("""    const kanji = 'name_orig' in a ? a.name_orig : (w?.ja ?? null);
    return { ...a, w, kanji, kind: 'author' };""",
    """    const orig = 'name_orig' in a ? a.name_orig : (w?.ja ?? null);
    const kanji = orig && CJK.test(orig) ? orig : null;
    return { ...a, w, kanji, orig: orig || a.name_ru, kind: 'author' };""")
rep("""    return { ...t, w: t.wikidata ? wd[t.wikidata] : null, kanji: null, kind: 'translator' };""",
    """    return { ...t, w: t.wikidata ? wd[t.wikidata] : null, kanji: null, orig: t.name_ru, kind: 'translator' };""")
rep("""        parts.push(a.name_ru, a.kanji);""", """        parts.push(a.name_ru, a.orig);""")

# карточка человека: иероглифы — вертикально, остальное — горизонтально над портретом
rep("""    const name = p.kanji
      ? `<span class="fuda-v" lang="ja">${esc(p.kanji)}</span>`
      : `<span class="fuda-v ru">${esc(p.name_ru)}</span>`;
    const pic = p.w?.image
      ? `<img class="portrait" src="${esc(p.w.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : `<div class="portrait none">${esc((p.kanji || p.name_ru)[0])}</div>`;
    return `<div class="fuda yomi" style="--fc:${personColor(p)}" aria-hidden="true">${pic}${name}</div>`;""",
    """    const orig = p.orig || p.name_ru;
    const name = p.kanji
      ? `<span class="fuda-v" lang="ja">${esc(p.kanji)}</span>`
      : `<span class="fuda-h">${esc(orig)}</span>`;
    const pic = p.w?.image
      ? `<img class="portrait" src="${esc(p.w.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : `<div class="portrait none">${esc(orig[0])}</div>`;
    return `<div class="fuda yomi${p.kanji ? '' : ' h'}" style="--fc:${personColor(p)}" aria-hidden="true">${pic}${name}</div>`;""")

# шапка профиля и строка «Имя в оригинале»
rep("""        ${p.kanji ? `<p class="orig" lang="ja">${esc(p.kanji)}</p>` : ''}""",
    """        ${p.kanji ? `<p class="orig" lang="ja">${esc(p.kanji)}</p>` : p.orig && p.orig !== p.name_ru ? `<p class="orig">${esc(p.orig)}</p>` : ''}""")
rep("""      w?.en && ['Латиницей', esc(w.en)],""",
    """      p.kind === 'author' && !p.kanji && p.orig !== p.name_ru && ['Имя в оригинале', esc(p.orig)],
      w?.en && w.en !== p.orig && ['Латиницей', esc(w.en)],""")

# алфавит, переключатель «карточки / список»
rep("""  function lettersPage({ title, sub, people, hrefBase, prefix, extra }) {
    const sorted = [...people].sort((a, b) => collator.compare(a.sort, b.sort));""",
    """  function lettersPage({ title, sub, people, hrefBase, prefix, extra, params }) {
    const sorted = [...people].sort((a, b) => alphaCompare(a.sort, b.sort) || alphaCompare(a.name_ru, b.name_ru));
    const asList = params?.get('view') === 'list';""")
rep("""      <nav class="letters" aria-label="Буквы">${letters.map((L) => `<a href="#/${hrefBase}s" data-jump="${prefix}-${L}">${L}</a>`).join('')}</nav>
      ${section('По алфавиту')}
      ${legend('era')}
      ${peopleDeck(sorted, hrefBase, extra, marker)}`;""",
    """      <nav class="letters" aria-label="Буквы">${letters.map((L) => `<a href="#/${hrefBase}s" data-jump="${prefix}-${L}">${L}</a>`).join('')}</nav>
      <div class="view-switch" role="group" aria-label="Вид">
        <a href="#/${hrefBase}s" ${asList ? '' : 'aria-current="true"'}>Карточки</a><a href="#/${hrefBase}s?view=list" ${asList ? 'aria-current="true"' : ''}>Список</a>
      </div>
      ${section('По алфавиту')}
      ${asList ? peopleList(sorted, letterOf, hrefBase, prefix, extra) : `${legend('era')}${peopleDeck(sorted, hrefBase, extra, marker)}`}`;
  }

  // Текстовый список имён по буквам
  function peopleList(sorted, letterOf, hrefBase, prefix, extra) {
    const groups = [];
    for (const p of sorted) {
      const L = letterOf(p);
      if (!groups.length || groups[groups.length - 1][0] !== L) groups.push([L, []]);
      groups[groups.length - 1][1].push(p);
    }
    return `<div class="name-list">${groups.map(([L, ps]) => `<section class="name-group">
      <h3 id="${prefix}-${L}">${L}</h3>
      <ul>${ps.map((p) => `<li><a href="#/${hrefBase}/${p.id}">${esc(p.name_ru)}</a>${p.orig && p.orig !== p.name_ru ? ` <span class="o"${p.kanji ? ' lang="ja"' : ''}>${esc(p.orig)}</span>` : ''}${lifeYears(p.w) ? ` <span class="y">${lifeYears(p.w)}</span>` : ''}${extra ? `<span class="x">${extra(p)}</span>` : ''}</li>`).join('')}</ul>
    </section>`).join('')}</div>`;""")
rep("""  const pageAuthors = () => lettersPage({""", """  const pageAuthors = (params) => lettersPage({ params,""")
rep("""  const pageTranslators = () => lettersPage({""", """  const pageTranslators = (params) => lettersPage({ params,""")
rep("""      case 'authors': html = pageAuthors(); title = 'Авторы'; break;""",
    """      case 'authors': html = pageAuthors(params); title = 'Авторы'; break;""")
rep("""      case 'translators': html = pageTranslators(); title = 'Переводчики'; break;""",
    """      case 'translators': html = pageTranslators(params); title = 'Переводчики'; break;""")
open(p, 'w', encoding='utf-8').write(s)
print('ok')
