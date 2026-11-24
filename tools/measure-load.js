// Открытие страницы с нуля: каждый маршрут загружается в iframe, замеряется время до готовой страницы
// (контент в #app и два кадра после него) и суммарная длина «долгих задач» основного потока.
// Запускать на собранной версии (npm run build && npm run preview), вкладка — на переднем плане.
async () => {
  const ROUTES = window.__measureRoutes || ['#/', '#/authors', '#/works', '#/editions', '#/nonfiction', '#/search', '#/search?view=list', '#/translator/markova'];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = {};
  for (const r of ROUTES) {
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:900px;border:0;opacity:0.01;pointer-events:none';
      const t0 = performance.now();
      f.src = `/${r}`;
      document.body.appendChild(f);
      let ready = null;
      for (let k = 0; k < 400 && ready === null; k++) {
        await sleep(10);
        const w = f.contentWindow, app = f.contentDocument?.getElementById('app');
        if (app && app.children.length && !/Загрузка/.test(app.textContent.slice(0, 20))) {
          await new Promise((res) => w.requestAnimationFrame(() => w.requestAnimationFrame(res)));
          ready = performance.now() - t0;
        }
      }
      const nodes = f.contentDocument.querySelectorAll('#app *').length;
      const long = f.contentWindow.performance.getEntriesByType?.('longtask') || [];
      runs.push({ ready, nodes, long: long.length });
      f.remove();
      await sleep(300);
    }
    runs.sort((a, b) => a.ready - b.ready);
    out[r] = { readyMs: Math.round(runs[1].ready), nodes: runs[1].nodes };
  }
  return out;
}
