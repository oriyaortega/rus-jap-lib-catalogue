// Сверка новой версии с исходной: запускается в странице dev-сервера (http://localhost:5173/),
// например через Chrome DevTools: evaluate_script с этим файлом.
// Для каждого маршрута открывает /legacy/index.html#… и /#… в iframe одного адреса,
// ждёт отрисовки и сравнивает: (1) структуру DOM внутри #app — теги, классы, атрибуты, текст;
// (2) видимый текст (innerText), где важны и пробелы между элементами.
async () => {
  const ROUTES = window.__compareRoutes || [
    '#/', '#/authors', '#/authors?view=list', '#/translators', '#/translators?view=list',
    '#/author/konrad', '#/author/murakami', '#/author/ivab000f4c0', '#/author/marchukivan', '#/author/sekiguchiryoko', '#/author/nijo',
    '#/translator/markova', '#/translator/chkhartishvili', '#/translator/lvova',
    '#/works', '#/works?sort=year', '#/works?sort=title&q=%D0%BC%D0%B8%D1%81%D0%B8%D0%BC%D0%B0', '#/works?kind=%D1%80%D0%BE%D0%BC%D0%B0%D0%BD',
    '#/editions', '#/editions?view=list', '#/editions?sort=year', '#/editions?sort=publisher&view=list', '#/editions/1974', '#/editions/early', '#/editions/1800',
    '#/nonfiction', '#/nonfiction?view=list&sort=year', '#/nonfiction?sort=publisher',
    '#/search', '#/search?q=%D0%9C%D0%B8%D1%88%D0%B8%D0%BC%D0%B0', '#/search?tags=%D0%BC%D0%B0%D0%BD%D0%B3%D0%B0', '#/search?q=%E9%9B%AA%E5%9B%BD&view=list',
    '#/search?q=Murakami&sort=year', '#/search?tags=%D0%BD%D0%B5%D1%85%D1%83%D0%B4%D0%BE%D0%B6%D0%B5%D1%81%D1%82%D0%B2%D0%B5%D0%BD%D0%BD%D0%B0%D1%8F,%D0%BF%D0%BE%D0%BB%D0%B8%D1%82%D0%B8%D0%BA%D0%B0&sort=title',
    '#/book/s1', '#/book/ll2', '#/book/b1', '#/book/iv1371', '#/book/lb679330', '#/book/x92', '#/book/am1', '#/book/wj1046', '#/book/bja1',
    '#/series/bjl', '#/series/hidebooks', '#/about', '#/no-such-page',
  ];
  // новые возможности, которых нет в старой версии: сортировка изданий по дате добавления.
  // Стрелка направления у сортировки изданий и кнопки в заголовках их таблицы тоже новые — на #/editions будут отличия.
  const IGNORE = window.__compareIgnore || ['#app a[href*="sort=added"]'];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function frame(src) {
    return new Promise((resolve) => {
      const f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;left:-3000px;top:0;width:1280px;height:900px;border:0';
      f.src = src;
      document.body.appendChild(f);
      resolve(f);
    });
  }
  // Ждём, пока #app перестанет меняться (данные, Викиданные, биография из Википедии)
  async function settled(f) {
    let last = '', same = 0;
    for (let i = 0; i < 120; i++) {
      const app = f.contentDocument?.readyState === 'complete' && f.contentWindow.location.href !== 'about:blank' ? f.contentDocument.getElementById('app') : null;
      const html = app ? app.innerHTML : '';
      if (html && !/^<p>Загрузка…<\/p>$/.test(html.trim()) && html === last) { if (++same >= 4) return app; } else same = 0;
      last = html;
      await sleep(250);
    }
    return f.contentDocument?.getElementById('app') || null;
  }
  const normStyle = (s) => s.replace(/\s+/g, '').replace(/;$/, '');
  // Сериализация дерева без пробельных текстовых узлов; атрибуты по алфавиту
  function skel(node, out = []) {
    // соседние текстовые узлы склеиваются: React делит текст на части там, где в шаблоне были вставки
    let text = '';
    const flush = () => { const t = text.replace(/\s+/g, ' ').trim(); if (t) out.push(`"${t}"`); text = ''; };
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { text += n.textContent; continue; }
      if (n.nodeType !== 1) continue;
      flush();
      // у option выбранность — свойство (React не пишет атрибут selected)
      if (n.tagName === 'OPTION') n.toggleAttribute('selected', n.selected);
      const attrs = [...n.attributes]
        .map((a) => `${a.name}=${a.name === 'style' ? normStyle(n.style.cssText) : a.name === 'href' && a.value.startsWith('javascript:') ? '#' : a.value}`)
        .sort().join(' ');
      out.push(`<${n.tagName.toLowerCase()}${attrs ? ' ' + attrs : ''}>`);
      skel(n, out);
      out.push(`</${n.tagName.toLowerCase()}>`);
    }
    flush();
    return out;
  }
  function firstDiff(a, b) {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) if (a[i] !== b[i]) return { at: i, legacy: a.slice(Math.max(0, i - 3), i + 4).join(''), react: b.slice(Math.max(0, i - 3), i + 4).join('') };
    return a.length === b.length ? null : { at: n, legacy: a.slice(n, n + 5).join(''), react: b.slice(n, n + 5).join(''), lenLegacy: a.length, lenReact: b.length };
  }
  // Раскладка: положение и размер каждого элемента страницы (шапка, меню, содержимое), с точностью до пикселя
  function layout(doc) {
    const els = [...doc.querySelectorAll('.masthead, .masthead *, .topnav, .topnav *, #app, #app *')];
    return els.map((e) => { const r = e.getBoundingClientRect(); return `${e.tagName.toLowerCase()}.${e.className}@${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}x${Math.round(r.height)}`; });
  }
  function textDiff(a, b) {
    if (a === b) return null;
    let i = 0; while (i < a.length && a[i] === b[i]) i++;
    return { at: i, legacy: JSON.stringify(a.slice(Math.max(0, i - 40), i + 60)), react: JSON.stringify(b.slice(Math.max(0, i - 40), i + 60)) };
  }

  // новая версия рисует длинные списки постепенно — для сверки рисуем всё сразу
  localStorage.setItem('lazy', 'off');
  const results = [];
  for (const r of ROUTES) {
    const [fl, fr] = await Promise.all([frame(`/legacy/index.html${r}`), frame(`/${r}`)]);
    const [al, ar] = await Promise.all([settled(fl), settled(fr)]);
    // элементы, которых нет в старой версии (новые возможности), из новой убираются перед сравнением
    for (const sel of IGNORE) fr.contentDocument.querySelectorAll(sel).forEach((e) => e.remove());
    if (!al || !ar) { results.push({ route: r, ok: false, error: `нет #app: legacy=${!!al} react=${!!ar}` }); fl.remove(); fr.remove(); continue; }
    const s = firstDiff(skel(al), skel(ar));
    const t = textDiff(al.innerText, ar.innerText);
    const width = window.__compareWidth || 1280;
    fl.style.width = fr.style.width = `${width}px`;
    await sleep(300);
    const lay = firstDiff(layout(fl.contentDocument), layout(fr.contentDocument));
    const title = fl.contentDocument.title === fr.contentDocument.title ? null : [fl.contentDocument.title, fr.contentDocument.title];
    const nav = [fl, fr].map((f) => f.contentDocument.querySelector('.topnav [aria-current]')?.textContent || '');
    results.push({ route: r, ok: !s && !t && !lay && !title && nav[0] === nav[1], ...(s && { dom: s }), ...(lay && { layout: lay }), ...(t && { text: t }), ...(title && { title }), ...(nav[0] !== nav[1] && { nav }) });
    fl.remove(); fr.remove();
  }
  localStorage.removeItem('lazy');
  const bad = results.filter((x) => !x.ok);
  return { total: results.length, same: results.length - bad.length, differences: bad };
}
