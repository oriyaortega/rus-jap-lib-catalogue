import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()


def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (old[:70], s.count(old))
    s = s.replace(old, new)


rep("""      ['Автор', b.authors.map((aid) => { const a = authorInfo(aid); return `${authorLink(aid)}${a.kanji ? ` <span lang="ja">${esc(a.kanji)}</span>` : ''}`; }).join(', ')],""",
    """      b.authors.length && [b.authors.length > 1 ? 'Авторы' : 'Автор', b.authors.map((aid) => { const a = authorInfo(aid); return `${authorLink(aid)}${a.kanji ? ` <span lang="ja">${esc(a.kanji)}</span>` : ''}`; }).join(', ')],""")
rep("""      ['Место издания', esc(b.city)],
      ['Издательство', esc(b.publisher)],
      ['Год издания', `<a href="#/editions/${b.year}">${b.year}</a>`],
      ['Страниц', b.pages],""", """      b.city && ['Место издания', esc(b.city)],
      b.publisher && ['Издательство', esc(b.publisher)],
      ['Год издания', b.year ? `<a href="#/editions/${b.year}">${b.year}</a>` : 'не указан'],
      b.pages && ['Страниц', b.pages],""")
rep("""      b.source && ['Источник', `<a href="${esc(b.source)}" target="_blank" rel="noopener">Фантлаб</a>`],
    ].filter(Boolean);
    const contents = b.contents?.length > 1 ? `
      ${section(`Содержание · ${b.contents.length}`)}
      <ol class="contents">${b.contents.map((w) => `<li>
        <span class="w">${w.a && (b.authors.length > 1 || w.a !== b.authors[0]) ? `${authorLink(w.a)}. ` : ''}${esc(w.t)}</span>
        <span class="k">${esc(w.k)}${w.tr.length ? `, пер. ${w.tr.map((t) => translatorLink(t)).join(', ')}` : ''}</span>
        ${w.p ? `<span class="pp">с. ${esc(w.p)}</span>` : ''}</li>`).join('')}</ol>` : '';""",
"""      (b.source || b.sources) && ['Источник', [
        b.source && `<a href="${esc(b.source)}" target="_blank" rel="noopener">${esc(sourceName(b.source))}</a>`,
        ...(b.sources || []).filter((x) => !b.source || SOURCE_NAMES[x] !== sourceName(b.source)).map((x) => esc(SOURCE_NAMES[x] || x)),
      ].filter(Boolean).join(', ')],
    ].filter(Boolean);
    const items = b.contents || [];
    const list = `<ol class="contents">${items.map((w) => `<li>
        <span class="w">${w.a && (b.authors.length !== 1 || w.a !== b.authors[0]) ? `${authorLink(w.a)}. ` : (w.at ? `${esc(w.at)}. ` : '')}${esc(w.t)}${w.o ? ` <span lang="ja">${esc(w.o)}</span>` : ''}</span>
        ${w.k || w.tr.length ? `<span class="k">${esc(w.k || '')}${w.k && w.tr.length ? ', ' : ''}${w.tr.length ? `пер. ${w.tr.map((t) => translatorLink(t)).join(', ')}` : ''}</span>` : ''}
        ${w.p ? `<span class="pp">с. ${esc(w.p)}</span>` : ''}</li>`).join('')}</ol>`;
    // длинное содержание (антологии на сотни стихотворений) сворачиваем
    const contents = items.length > 1 ? (items.length > 60
      ? `${section(`Содержание · ${items.length}`)}<details class="contents-more"><summary>Показать всё содержание (${plural(items.length, ['позиция', 'позиции', 'позиций'])})</summary>${list}</details>`
      : `${section(`Содержание · ${items.length}`)}${list}`) : '';""")

rep("""    const groupTitle = (g) => ({ 'исследование': 'Исследования', 'очерки': 'Очерки и публицистика' }[g] || g[0].toUpperCase() + g.slice(1));""",
    """    const groupTitle = (g) => ({ 'исследование': 'Исследования', 'очерки': 'Очерки и публицистика', 'история': 'История', 'искусство': 'Искусство',
      'справочник': 'Справочники и словари', 'учебник': 'Учебники и разговорники' }[g] || g[0].toUpperCase() + g.slice(1));""")
rep("""    for (const b of [...books].sort((x, y) => collator.compare(firstAuthorSort(x), firstAuthorSort(y)) || x.year - y.year)) {""",
    """    for (const b of [...books].sort((x, y) => collator.compare(firstAuthorSort(x), firstAuthorSort(y)) || (x.year || 0) - (y.year || 0))) {""")

rep("""  const SOURCE_NAMES = {""", """  const sourceName = (url) => (/fantlab/.test(url) ? 'Фантлаб' : /polyandria/.test(url) ? 'сайт «Поляндрии»' : /labirint/.test(url) ? 'Лабиринт'
    : /hse\\.ru/.test(url) ? 'сайт ВШЭ' : /wikipedia/.test(url) ? 'Википедия' : 'ссылка');
  const SOURCE_NAMES = {""")

# search: sort with missing years
rep("""      year: (a, b) => a.year - b.year,
      'year-desc': (a, b) => b.year - a.year,""", """      year: (a, b) => (a.year || 9999) - (b.year || 9999),
      'year-desc': (a, b) => (b.year || 0) - (a.year || 0),""")
rep("""      author: (a, b) => collator.compare(firstAuthorSort(a), firstAuthorSort(b)) || a.year - b.year,
      'author-desc': (a, b) => collator.compare(firstAuthorSort(b), firstAuthorSort(a)) || a.year - b.year,""",
    """      author: (a, b) => collator.compare(firstAuthorSort(a), firstAuthorSort(b)) || (a.year || 0) - (b.year || 0),
      'author-desc': (a, b) => collator.compare(firstAuthorSort(b), firstAuthorSort(a)) || (a.year || 0) - (b.year || 0),""")

# search index: contents authors' plain names and originals
rep("""        ...(b.contents || []).flatMap((w) => [w.t, w.a && authorInfo(w.a).name_ru])];""",
    """        ...(b.contents || []).flatMap((w) => [w.t, w.o, w.at, w.a && authorInfo(w.a).name_ru, w.a && authorInfo(w.a).kanji])];""")

# about page
rep("""Исключение — серия ${catalog.series.map((s) => `<a href="#/series/${esc(s.id)}">«${esc(s.name)}»</a>`).join(', ')}: её тома внесены по данным <a href="https://fantlab.ru" target="_blank" rel="noopener">Фантлаба</a>, обложки показываются оттуда же.</p>`;""",
    """Остальные книги внесены по картотеке составителя и открытым источникам: <a href="https://fantlab.ru" target="_blank" rel="noopener">Фантлаб</a> (серия «Библиотека японской литературы», переводы Е. А. Рябовой, поиск произведений японских авторов), каталог издательства «Поляндрия NoAge», «Лабиринт» (серия Orientalia et Classica), сайт ВШЭ (книги В. В. Щепкина) и Википедия (книги Е. С. Штейнера). Обложки показываются с сайтов-источников.</p>`;""")

open(p, 'w', encoding='utf-8').write(s)
print('ok')
