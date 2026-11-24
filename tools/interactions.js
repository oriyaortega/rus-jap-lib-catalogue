// Сценарий взаимодействий для сверки старой и новой версии: запускается в каждой версии отдельно
// (Chrome DevTools: evaluate_script с этим файлом), результаты сравниваются.
async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const go = async (h) => { location.hash = h; await sleep(700); };
  const click = async (el) => { el.click(); await sleep(500); };
  const state = () => ({
    hash: decodeURIComponent(location.hash),
    title: document.title,
    nav: document.querySelector('.topnav [aria-current]')?.textContent || '',
    h1: document.querySelector('#app h1')?.textContent || '',
    found: document.querySelector('.found')?.textContent || '',
    pressed: [...document.querySelectorAll('.tagcloud button[aria-pressed="true"]')].map((b) => b.textContent),
    first: [...document.querySelectorAll('#app .deck .caption .t, #app table.list tbody tr td:first-child')].slice(0, 3).map((e) => e.textContent),
    scrollY: Math.round(scrollY),
  });
  const log = {};

  // 1. Теги: включить «манга», затем «переводная», затем выключить «манга»
  await go('#/search');
  const tag = (t) => [...document.querySelectorAll('.tagcloud button')].find((b) => b.dataset.tag === t);
  await click(tag('манга')); log.tag1 = state();
  await click(tag('переводная')); log.tag2 = state();
  await click(tag('манга')); log.tag3 = state();

  // 2. Сортировка и вид по ссылкам
  await click([...document.querySelectorAll('.view-switch a')].find((a) => a.textContent === 'по году издания')); log.sortYear = state();
  await click([...document.querySelectorAll('.view-switch a')].find((a) => a.textContent === 'Список')); log.list = state();

  // 3. Произведения: сортировка по столбцу и фильтр по виду
  await go('#/works');
  await click(document.querySelector('[data-works-sort="year"]')); log.worksYear = state();
  const sel = document.getElementById('wkind');
  const setSel = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setSel.call(sel, 'повесть'); sel.dispatchEvent(new Event('change', { bubbles: true })); await sleep(500);
  log.worksKind = { ...state(), rows: document.querySelectorAll('#app table.list tbody tr').length, selected: document.getElementById('wkind').value };

  // 4. Переход по букве в перечне авторов: адрес не меняется, страница прокручивается
  await go('#/authors');
  const letter = [...document.querySelectorAll('.letters a')].find((a) => a.textContent === 'Н');
  letter.click(); await sleep(1500);
  const mark = document.getElementById('A-Н');
  log.jump = { ...state(), scrolled: scrollY > 1000, markInView: Math.abs(mark.getBoundingClientRect().top) < 5 };

  // 5. Переход на другую страницу прокручивает наверх
  await go('#/author/murakami'); log.authorTop = state();

  // 6. Переключатель палитры: включить и выключить
  const toggle = document.getElementById('palette-toggle');
  await click(toggle); log.palette1 = { on: document.documentElement.dataset.palette || '', label: toggle.textContent.trim(), pressed: document.getElementById('palette-toggle').getAttribute('aria-pressed'), stored: localStorage.getItem('palette') };
  await click(document.getElementById('palette-toggle')); log.palette2 = { on: document.documentElement.dataset.palette || '', label: document.getElementById('palette-toggle').textContent.trim(), stored: localStorage.getItem('palette') };

  // 7. Книга, затем «← назад»
  await go('#/book/s1');
  await click(document.querySelector('.back a')); await sleep(500); log.back = state();

  // 8. Год издания на странице книги ведёт в «Издания» за этот год; там раскрыт выбор года
  await go('#/book/s1');
  await click([...document.querySelectorAll('table.card a')].find((a) => /^\d{4}$/.test(a.textContent)));
  log.year = { ...state(), open: document.querySelector('details.year-filter')?.open, current: document.querySelector('.years [aria-current]')?.textContent };

  // 9. Свернутое содержание антологии раскрывается
  await go('#/book/s1');
  log.contents = { items: document.querySelectorAll('ol.contents li').length, details: !!document.querySelector('details.contents-more') };

  return log;
}
