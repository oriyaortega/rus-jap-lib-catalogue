import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()


def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (old[:70], s.count(old))
    s = s.replace(old, new)


rep("""    extra: (p) => plural(booksOf(p.id).length, ['издание', 'издания', 'изданий']),""",
"""    extra: (p) => {
      const nb = booksOf(p.id).length, nw = worksOf(p.id).length;
      return [nb && plural(nb, ['издание', 'издания', 'изданий']), nw && plural(nw, ['произведение', 'произведения', 'произведений'])].filter(Boolean).join(' · ');
    },""")

rep("""    const books = booksOf(id).sort((x, y) => x.year - y.year);
    const works = new Map();""", """    const books = booksOf(id).sort((x, y) => (x.year || 9999) - (y.year || 9999));
    const works = new Map();""")

rep("""            <ul class="ed-list">${eds.map((e) => `<li><a href="#/book/${e.id}">${esc(e.title_ru)}</a> — «${esc(e.publisher)}», ${esc(e.city)}, ${e.year}${e.translators.length ? `; пер. ${translatorsShort(e)}` : ''}</li>`).join('')}</ul>
          </div>
        </div>`;
      }).join('')}`;
  }""", """            <ul class="ed-list">${eds.map((e) => `<li><a href="#/book/${e.id}">${esc(e.title_ru)}</a> — ${imprintText(e)}${e.translators.length ? `; пер. ${translatorsShort(e)}` : ''}</li>`).join('')}</ul>
          </div>
        </div>`;
      }).join('')}
      ${worksList(worksOf(id), `Произведения на русском языке · ${worksOf(id).length}`)}`;
  }

  // Список произведений (по данным Фантлаба): русское название, оригинал, вид
  function worksList(list, title) {
    if (!list.length) return '';
    const sorted = [...list].sort((x, y) => collator.compare(x.title_ru, y.title_ru));
    return `${section(title)}
      <ul class="works-list">${sorted.map((w) => `<li>
        <span class="w">${w.fantlab ? `<a href="https://fantlab.ru/work${w.fantlab}" target="_blank" rel="noopener">${esc(w.title_ru)}</a>` : esc(w.title_ru)}</span>
        ${w.title_orig ? ` <span lang="ja">${esc(w.title_orig)}</span>` : ''}${w.title_romaji ? ` <span class="romaji">${esc(w.title_romaji)}</span>` : ''}
        ${w.kind ? ` <span class="k">${esc(w.kind)}</span>` : ''}</li>`).join('')}</ul>`;
  }""")

rep("""    const books = translationsOf(id).sort((x, y) => x.year - y.year);""",
    """    const books = translationsOf(id).sort((x, y) => (x.year || 9999) - (y.year || 9999));""")

start = s.index("  function pageWorks(params) {")
end = s.index("  function pageEditions(year) {")
s = s[:start] + """  function pageWorks(params) {
    const sort = params.get('sort') || 'author';
    const q = params.get('q') || '';
    const kind = params.get('kind') || '';
    const all = catalog.works || [];
    const kinds = [...new Set(all.map((w) => w.kind).filter(Boolean))].sort((a, b) => collator.compare(a, b));
    const nq = norm(q);
    const firstSort = (w) => authorsById.get(w.authors[0])?.sort || '';
    let rows = all.filter((w) => (!kind || w.kind === kind) &&
      (!nq || norm([w.title_ru, w.title_orig, w.title_romaji, ...w.authors.map((a) => authorInfo(a).name_ru)].join(' ')).includes(nq) ||
        String(w.title_orig || '').includes(q)));
    const cmp = {
      title: (x, y) => collator.compare(x.title_ru, y.title_ru),
      author: (x, y) => collator.compare(firstSort(x), firstSort(y)) || collator.compare(x.title_ru, y.title_ru),
      kind: (x, y) => collator.compare(x.kind || '', y.kind || '') || collator.compare(x.title_ru, y.title_ru),
    }[sort] || (() => 0);
    rows = rows.sort(cmp);
    const th = (key, label, cls = '') => `<th class="${cls}"><button type="button" data-works-sort="${key}">${label}${sort === key ? ' ▾' : ''}</button></th>`;
    return `
      <h1>Произведения</h1>
      <p class="sub">переведённые на русский язык · ${plural(all.length, ['произведение', 'произведения', 'произведений'])} · по данным Фантлаба и картотеки</p>
      <form class="searchbar" id="works-form">
        <input id="wq" type="search" value="${esc(q)}" placeholder="Название, автор или иероглифы" aria-label="Поиск по произведениям" autocomplete="off">
        <select id="wkind" aria-label="Вид произведения"><option value="">все виды</option>${kinds.map((k) => `<option value="${esc(k)}" ${k === kind ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>
      </form>
      <p class="found">Показано: ${rows.length} из ${all.length}</p>
      <table class="list">
        <thead><tr>${th('title', 'Название')}<th class="hide-sm">Оригинал</th>${th('author', 'Автор')}${th('kind', 'Вид')}</tr></thead>
        <tbody>${rows.map((w) => `<tr>
          <td>${w.fantlab ? `<a href="https://fantlab.ru/work${w.fantlab}" target="_blank" rel="noopener">${esc(w.title_ru)}</a>` : esc(w.title_ru)}</td>
          <td class="hide-sm" lang="ja">${esc(w.title_orig || w.title_romaji || '—')}</td>
          <td>${w.authors.map(authorLink).join(', ') || '—'}</td>
          <td>${esc(w.kind || '—')}</td></tr>`).join('')}</tbody>
      </table>`;
  }

""" + s[end:]

rep("""    const early = catalog.books.some((b) => b.year < 1950);""",
    """    const early = catalog.books.some((b) => b.year && b.year < 1950);""")
rep("""        .filter((b) => (year === 'early' ? b.year < 1950 : b.year === +year))""",
    """        .filter((b) => (year === 'early' ? b.year && b.year < 1950 : b.year === +year))""")

rep("""    if (ws) { history.replaceState(null, '', `#/works?sort=${ws.dataset.worksSort}`); route(); return; }""",
    """    if (ws) { setParams('works', (p) => p.set('sort', ws.dataset.worksSort)); return; }""")

rep("""  // Поиск: обновляем адрес и перерисовываем, сохраняя фокус в поле ввода
  function setSearch(mut, keepFocus) {
    const p = new URLSearchParams(location.hash.split('?')[1] || '');
    mut(p);
    [...p.keys()].forEach((k) => { if (!p.get(k)) p.delete(k); });
    const s = p.toString();
    history.replaceState(null, '', `#/search${s ? `?${s}` : ''}`);
    const pos = keepFocus ? document.getElementById('q')?.selectionStart : null;
    route();
    if (keepFocus) { const q = document.getElementById('q'); q.focus(); q.setSelectionRange(pos, pos); }
  }

  document.addEventListener('input', (e) => { if (e.target.id === 'q') setSearch((p) => p.set('q', e.target.value), true); });
  document.addEventListener('change', (e) => { if (e.target.id === 'sort') setSearch((p) => p.set('sort', e.target.value)); });
  document.addEventListener('submit', (e) => { if (e.target.id === 'search-form') e.preventDefault(); });""",
"""  // Поиск и фильтры: обновляем адрес и перерисовываем, сохраняя фокус в поле ввода
  function setParams(page, mut, focusId) {
    const p = new URLSearchParams(location.hash.split('?')[1] || '');
    mut(p);
    [...p.keys()].forEach((k) => { if (!p.get(k)) p.delete(k); });
    const s = p.toString();
    history.replaceState(null, '', `#/${page}${s ? `?${s}` : ''}`);
    const pos = focusId ? document.getElementById(focusId)?.selectionStart : null;
    route();
    if (focusId) { const el = document.getElementById(focusId); el.focus(); el.setSelectionRange(pos, pos); }
  }
  const setSearch = (mut, keepFocus) => setParams('search', mut, keepFocus ? 'q' : null);

  document.addEventListener('input', (e) => {
    if (e.target.id === 'q') setSearch((p) => p.set('q', e.target.value), true);
    if (e.target.id === 'wq') setParams('works', (p) => p.set('q', e.target.value), 'wq');
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'sort') setSearch((p) => p.set('sort', e.target.value));
    if (e.target.id === 'wkind') setParams('works', (p) => p.set('kind', e.target.value));
  });
  document.addEventListener('submit', (e) => { if (e.target.id === 'search-form' || e.target.id === 'works-form') e.preventDefault(); });""")

open(p, 'w', encoding='utf-8').write(s)
print('ok')
