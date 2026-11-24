import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()


def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (old[:70], s.count(old))
    s = s.replace(old, new)


# источники
rep("""  const sourceName = (url) => (/fantlab/.test(url) ? 'Фантлаб' : /polyandria/.test(url) ? 'сайт «Поляндрии»' : /labirint/.test(url) ? 'Лабиринт'
    : /hse\\.ru/.test(url) ? 'сайт ВШЭ' : /wikipedia/.test(url) ? 'Википедия' : 'ссылка');""",
    """  const sourceName = (url) => (/fantlab/.test(url) ? 'Фантлаб' : /polyandria/.test(url) ? 'сайт «Поляндрии»' : /labirint/.test(url) ? 'Лабиринт'
    : /hse\\.ru/.test(url) ? 'сайт ВШЭ' : /wikipedia/.test(url) ? 'Википедия' : /azbooka/.test(url) ? 'сайт «Азбуки»'
    : /bombora/.test(url) ? 'сайт «Бомборы»' : /livelib/.test(url) ? 'LiveLib' : /mann-ivanov-ferber/.test(url) ? 'сайт МИФ' : 'ссылка');""")
rep("""  const SOURCE_NAMES = { xlsx: 'картотека составителя', fantlab: 'Фантлаб', polyandria: 'сайт «Поляндрии»', labirint: 'Лабиринт', hse: 'сайт ВШЭ', wikipedia: 'Википедия' };""",
    """  const SOURCE_NAMES = { xlsx: 'картотека составителя', gsheet: 'таблица составителя', fantlab: 'Фантлаб', polyandria: 'сайт «Поляндрии»', labirint: 'Лабиринт',
    hse: 'сайт ВШЭ', wikipedia: 'Википедия', azbuka: 'сайт «Азбуки»', bombora: 'сайт «Бомборы»', livelib: 'LiveLib', mif: 'сайт МИФ' };
  // Серия одной строкой: «Название», № N
  const seriesText = (b, link = true) => {
    const s = seriesOf(b);
    if (!s) return '';
    const name = `«${esc(s.name)}»${b.series.no ? `, № ${b.series.no}` : ''}`;
    return link ? `<a href="#/series/${esc(s.id)}">${name}</a>` : name;
  };""")

# подпись под карточкой: серия
rep("""      <div class="caption" style="margin-top:0">${imprintText(b)}${b.translators.length ? `<br>пер. ${translatorsShort(b)}` : ''}</div>""",
    """      <div class="caption" style="margin-top:0">${imprintText(b)}${seriesOf(b) ? `<br>серия ${seriesText(b)}` : ''}${b.translators.length ? `<br>пер. ${translatorsShort(b)}` : ''}</div>""")

# список изданий на странице автора: серия и ISBN
rep("""<li><a href="#/book/${e.id}">${esc(e.title_ru)}</a> — ${imprintText(e)}${e.translators.length ? `; пер. ${translatorsShort(e)}` : ''}</li>""",
    """<li><a href="#/book/${e.id}">${esc(e.title_ru)}</a> — ${imprintText(e)}${seriesOf(e) ? `; серия ${seriesText(e)}` : ''}${e.isbn ? `; ISBN ${esc(e.isbn)}` : ''}${e.translators.length ? `; пер. ${translatorsShort(e)}` : ''}</li>""")

# страница книги: серия через seriesText, ISBN всегда
rep("""      seriesOf(b) && ['Серия', `<a href="#/series/${esc(b.series.id)}">«${esc(seriesOf(b).name)}»</a>${b.series.no ? `, № ${b.series.no}` : ''}`],
      b.isbn && ['ISBN', esc(b.isbn)],""",
    """      seriesOf(b) && ['Серия', seriesText(b)],
      ['ISBN', b.isbn ? esc(b.isbn) : '<span class="muted">не указан</span>'],""")

# о сайте
rep("""Остальные книги внесены по картотеке составителя и открытым источникам: <a href="https://fantlab.ru" target="_blank" rel="noopener">Фантлаб</a> (серия «Библиотека японской литературы», переводы Е. А. Рябовой, поиск произведений японских авторов), каталог издательства «Поляндрия NoAge», «Лабиринт» (серия Orientalia et Classica), сайт ВШЭ (книги В. В. Щепкина) и Википедия (книги Е. С. Штейнера). Обложки показываются с сайтов-источников.</p>`;""",
    """Остальные книги внесены по картотеке и таблице составителя и открытым источникам: <a href="https://fantlab.ru" target="_blank" rel="noopener">Фантлаб</a> (серия «Библиотека японской литературы», переводы Е. А. Рябовой и Е. М. Байбиковой, поиск произведений японских авторов), сайты издательств «Азбука», «Бомбора», «Поляндрия NoAge», МИФ, «Лабиринт» (серия Orientalia et Classica, книги издательства «Гиперион»), LiveLib, сайт ВШЭ (книги В. В. Щепкина и А. Н. Мещерякова) и Википедия (книги Е. С. Штейнера и А. Н. Мещерякова). Обложки показываются с сайтов-источников.</p>
    <p>В каталог входят: художественные книги японских авторов в русском переводе, художественные книги о Японии авторов из других стран и России, нехудожественные книги о Японии — история, культура, мифология, искусство, язык. Не входят практические пособия (рукоделие, кулинария, здоровье), раскраски, блокноты, путеводители и подарочные комплекты.</p>`;""")
open(p, 'w', encoding='utf-8').write(s)
print('ok')
