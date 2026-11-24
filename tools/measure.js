// Время открытия страниц: от смены адреса до первой отрисовки (два кадра) и число элементов в #app.
// Запускать на собранной версии (npm run build && npm run preview), вкладка — на переднем плане.
async () => {
  const ROUTES = window.__measureRoutes || [
    '#/authors', '#/authors?view=list', '#/translators', '#/works', '#/editions', '#/editions?view=list', '#/editions?sort=year',
    '#/nonfiction', '#/nonfiction?view=list', '#/search', '#/search?view=list', '#/search?q=%D1%8F%D0%BF%D0%BE%D0%BD%D0%B8%D1%8F',
    '#/author/ivab000f4c0', '#/translator/markova', '#/',
  ];
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const out = {};
  for (const r of ROUTES) {
    const times = [];
    let nodes = 0;
    for (let i = 0; i < 3; i++) {
      location.hash = '#/about';
      await frame(); await new Promise((res) => setTimeout(res, 200));
      const t0 = performance.now();
      location.hash = r;
      await frame();
      times.push(performance.now() - t0);
      nodes = document.querySelectorAll('#app *').length;
    }
    times.sort((a, b) => a - b);
    out[r] = { ms: Math.round(times[1]), nodes };
  }
  return out;
}
