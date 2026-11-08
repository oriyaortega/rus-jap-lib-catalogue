// Прототип каталога: свои данные (data/catalog.json) + сведения о людях из Викиданных и Википедии.
// Одностраничный сайт с разделами через адрес после «#»: #/authors, #/author/mishima, #/editions/1974 и т. д.
// Оформление по мотивам каруты: книга — карточка торифуда, человек — карточка ёмифуда.
(() => {
  'use strict';

  const TYPE_TAGS = ['художественная', 'нехудожественная', 'переводная', 'на русском'];
  // Теги, которые показываются всегда, даже если книг по ним пока нет
  const TOPIC_TAGS = ['бизнес', 'экономика', 'политика', 'театр кабуки'];   // темы нехудожественной литературы
  const ALWAYS_TAGS = [...TOPIC_TAGS, 'детская литература'];
  const WD_API = 'https://www.wikidata.org/w/api.php';
  const WD_CACHE_KEY = 'wd-cache-v2';
  const WD_TTL = 7 * 24 * 3600 * 1000;

  let catalog = { authors: [], translators: [], books: [], news: [], series: [] };
  let authorsById = new Map();
  let translatorsById = new Map();
  let bookNo = new Map();   // номер карточки, как в «Хякунин иссю»
  let wd = {};
  let wdState = 'loading';
  const wikiCache = new Map();

  const app = document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const collator = new Intl.Collator('ru', { sensitivity: 'base' });
  // Алфавитный порядок с Ё отдельной буквой после Е (Intl.Collator считает их одной)
  const ALPHABET = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
  const letterRank = (s) => { const i = ALPHABET.indexOf((s || '')[0]?.toUpperCase()); return i < 0 ? 99 : i; };
  const alphaCompare = (a, b) => letterRank(a) - letterRank(b) || collator.compare(a, b);
  const CJK = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/;
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  function plural(n, [one, few, many]) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return `${n} ${one}`;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} ${few}`;
    return `${n} ${many}`;
  }
  const fmtDate = (iso) => iso.split('-').reverse().join('.');

  // Японская запись числа: 1 → 一, 12 → 十二, 47 → 四十七, 100 → 百
  function kanjiNum(n) {
    const d = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    const part = (x, unit) => (x === 0 ? '' : (x === 1 ? '' : d[x]) + unit);
    const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), u = n % 10;
    return part(h, '百') + part(t, '十') + d[u] || '〇';
  }

  // Нормализация для поиска: регистр, ё/е, диакритика, разные транслитерации японских имён.
  function norm(s) {
    return String(s ?? '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/ё/g, 'е').replace(/э/g, 'е')
      .replace(/щ/g, 'с').replace(/ш/g, 'с')
      .replace(/дж/g, 'дз').replace(/ч(?=[иеяю])/g, 'т')
      .replace(/ou|oo/g, 'o').replace(/uu/g, 'u')
      .replace(/[«»"“”„'’\-–—.,:;!?()]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  // ================= Викиданные =================
  const readCache = () => { try { return JSON.parse(localStorage.getItem(WD_CACHE_KEY)) || {}; } catch { return {}; } };
  const writeCache = (c) => { try { localStorage.setItem(WD_CACHE_KEY, JSON.stringify(c)); } catch { /* недоступно */ } };
  const claim = (e, p) => e.claims?.[p]?.[0]?.mainsnak?.datavalue?.value ?? null;

  function wdDate(v) {
    const m = v?.time?.match(/^([+-])(\d+)-(\d\d)-(\d\d)/);
    if (!m) return null;
    const y = parseInt(m[2], 10) * (m[1] === '-' ? -1 : 1);
    const yStr = y < 0 ? `${-y} до н. э.` : String(y);
    if (v.precision >= 11) return { year: y, text: `${+m[4]} ${MONTHS[+m[3] - 1]} ${yStr}` };
    if (v.precision >= 9) return { year: y, text: yStr };
    return { year: y, text: `ок. ${yStr}` };
  }

  function parseEntity(e) {
    const label = (l) => e.labels?.[l]?.value ?? null;
    const img = claim(e, 'P18');
    return {
      ru: label('ru'), ja: label('ja'), en: label('en'),
      kana: claim(e, 'P1814'),
      born: wdDate(claim(e, 'P569')),
      died: wdDate(claim(e, 'P570')),
      birthplaceId: claim(e, 'P19')?.id ?? null,
      birthplace: null,
      image: img ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(img)}?width=240` : null,
      ruwiki: e.sitelinks?.ruwiki?.title ?? null,
      jawiki: e.sitelinks?.jawiki?.title ?? null,
      aliases: ['ru', 'en', 'ja'].flatMap((l) => (e.aliases?.[l] || []).map((a) => a.value)),
    };
  }

  async function wdGet(ids, props) {
    const out = {};
    for (let i = 0; i < ids.length; i += 50) {
      const url = `${WD_API}?action=wbgetentities&ids=${ids.slice(i, i + 50).join('|')}&props=${props}` +
        `&languages=ru|ja|en&sitefilter=ruwiki|jawiki&format=json&origin=*`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      Object.assign(out, (await res.json()).entities || {});
    }
    return out;
  }

  async function loadWikidata() {
    const cache = readCache(), now = Date.now();
    const qids = [...new Set([...catalog.authors, ...catalog.translators].map((p) => p.wikidata).filter(Boolean))];
    qids.forEach((q) => { if (cache[q]) wd[q] = cache[q].d; });
    const missing = qids.filter((q) => !cache[q] || now - cache[q].t > WD_TTL);
    try {
      if (missing.length) {
        const ents = await wdGet(missing, 'labels|aliases|claims|sitelinks');
        for (const [q, e] of Object.entries(ents)) if (e.missing === undefined) wd[q] = parseEntity(e);
        const places = [...new Set(missing.map((q) => wd[q]?.birthplaceId).filter(Boolean))];
        if (places.length) {
          const pe = await wdGet(places, 'labels');
          for (const q of missing) {
            const p = wd[q]?.birthplaceId;
            if (p && pe[p]) wd[q].birthplace = pe[p].labels?.ru?.value ?? pe[p].labels?.en?.value ?? null;
          }
        }
        missing.forEach((q) => { if (wd[q]) cache[q] = { t: now, d: wd[q] }; });
        writeCache(cache);
      }
      wdState = 'ok';
    } catch (err) {
      console.warn('Викиданные недоступны:', err);
      wdState = Object.keys(wd).length ? 'partial' : 'error';
    }
    buildIndex();
    route();
  }

  function wikiSummary(title) {
    if (!wikiCache.has(title)) {
      wikiCache.set(title, fetch(`https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
        .then((r) => (r.ok ? r.json() : null)).catch(() => null));
    }
    return wikiCache.get(title);
  }

  // ================= Люди =================
  function authorInfo(id) {
    const a = authorsById.get(id) || { id, name_ru: id, sort: id };
    const w = a.wikidata ? wd[a.wikidata] : null;
    // name_orig: строка — своё значение; null — японского имени нет; поля нет — берём из Викиданных
    const orig = 'name_orig' in a ? a.name_orig : (w?.ja ?? null);
    const kanji = orig && CJK.test(orig) ? orig : null;
    return { ...a, w, kanji, orig: orig || a.name_ru, kind: 'author' };
  }
  function translatorInfo(id) {
    const t = translatorsById.get(id) || { id, name_ru: id, short: id, sort: id };
    return { ...t, w: t.wikidata ? wd[t.wikidata] : null, kanji: null, orig: t.name_ru, kind: 'translator' };
  }
  const authorLink = (id) => `<a href="#/author/${esc(id)}">${esc(authorInfo(id).name_ru)}</a>`;
  const translatorLink = (id, full) => { const t = translatorInfo(id); return `<a href="#/translator/${esc(id)}">${esc(full ? t.name_ru : (t.short || t.name_ru))}</a>`; };
  const translatorsHtml = (b) => b.translators.map((id) => translatorLink(id)).join(', ');
  const authorsNames = (b) => b.authors.map((id) => esc(authorInfo(id).name_ru)).join(', ');
  const booksOf = (id) => catalog.books.filter((b) => b.authors.includes(id) || b.contents?.some((w) => w.a === id));
  const translationsOf = (id) => catalog.books.filter((b) => b.translators.includes(id));
  const firstAuthorSort = (b) => authorsById.get(b.authors[0])?.sort || '';
  const seriesOf = (b) => (b.series ? catalog.series.find((s) => s.id === b.series.id) : null);
  // Выходные данные одной строкой; пустые поля пропускаем
  const imprintText = (b) => [b.publisher && `«${esc(b.publisher)}»`, b.city && esc(b.city), b.year || 'б. г.'].filter(Boolean).join(', ');
  const worksOf = (id) => (catalog.works || []).filter((w) => w.authors.includes(id));
  const sourceName = (url) => (/fantlab/.test(url) ? 'Фантлаб' : /polyandria/.test(url) ? 'сайт «Поляндрии»' : /labirint/.test(url) ? 'Лабиринт'
    : /hse\.ru/.test(url) ? 'сайт ВШЭ' : /dvfu\.ru/.test(url) ? 'библиотека ДВФУ' : /orientalstudies/.test(url) ? 'сайт ИВ РАН' : /wikipedia/.test(url) ? 'Википедия' : /azbooka/.test(url) ? 'сайт «Азбуки»'
    : /bombora/.test(url) ? 'сайт «Бомборы»' : /livelib/.test(url) ? 'LiveLib' : /mann-ivanov-ferber/.test(url) ? 'сайт МИФ' : 'ссылка');
  const SOURCE_NAMES = { xlsx: 'картотека составителя', gsheet: 'таблица составителя', fantlab: 'Фантлаб', polyandria: 'сайт «Поляндрии»', labirint: 'Лабиринт',
    hse: 'сайт ВШЭ', wikipedia: 'Википедия', azbuka: 'сайт «Азбуки»', bombora: 'сайт «Бомборы»', livelib: 'LiveLib', mif: 'сайт МИФ' };
  // Серия одной строкой: «Название», № N
  const seriesText = (b, link = true) => {
    const s = seriesOf(b);
    if (!s) return '';
    const name = `«${esc(s.name)}»${b.series.no ? `, № ${b.series.no}` : ''}`;
    return link ? `<a href="#/series/${esc(s.id)}">${name}</a>` : name;
  };
  // Переводчики в подписи карточки: не больше трёх, остальные — «и др.»
  const translatorsShort = (b) => (b.translators.length > 3
    ? `${b.translators.slice(0, 3).map((id) => translatorLink(id)).join(', ')} и др.`
    : translatorsHtml(b));

  // Биография: своё поле bio важнее; иначе — вступление статьи Википедии (подгружается после отрисовки).
  // Короткие описания Викиданных не показываем: их может править кто угодно, встречается вандализм.
  function bioHtml(person, hash) {
    if (person.bio) return `<p>${esc(person.bio)}</p>${person.bio_src ? `<p class="src">Источник: <a href="${esc(person.bio_src.url)}" target="_blank" rel="noopener">${esc(person.bio_src.name)}</a></p>` : ''}`;
    const title = person.w?.ruwiki;
    if (title) {
      wikiSummary(title).then((s) => {
        const el = document.getElementById('bio');
        if (!el || !s?.extract || location.hash !== hash) return;
        el.innerHTML = `<p>${esc(s.extract)}</p><p class="src">Источник: <a href="https://ru.wikipedia.org/wiki/${encodeURIComponent(title)}" target="_blank" rel="noopener">Википедия</a>, CC BY-SA 4.0</p>`;
      });
    }
    return '';
  }
  function extLinks(p) {
    const w = p.w;
    return [
      p.wikidata && `<a href="https://www.wikidata.org/wiki/${esc(p.wikidata)}" target="_blank" rel="noopener">Викиданные (${esc(p.wikidata)})</a>`,
      w?.ruwiki && `<a href="https://ru.wikipedia.org/wiki/${encodeURIComponent(w.ruwiki)}" target="_blank" rel="noopener">Википедия</a>`,
      w?.jawiki && `<a href="https://ja.wikipedia.org/wiki/${encodeURIComponent(w.jawiki)}" target="_blank" rel="noopener" lang="ja">ウィキペディア</a>`,
    ].filter(Boolean).join(' · ');
  }
  const lifeYears = (w) => (w?.born ? `${w.born.year}–${w.died ? w.died.year : ''}` : '');

  function buildIndex() {
    for (const b of catalog.books) {
      const parts = [b.title_ru, b.title_orig, b.title_romaji, b.publisher, b.city, b.year, b.genre, b.isbn, seriesOf(b)?.name, ...b.tags,
        ...(b.contents || []).flatMap((w) => [w.t, w.o, w.at, w.a && authorInfo(w.a).name_ru, w.a && authorInfo(w.a).kanji])];
      for (const id of b.authors) {
        const a = authorInfo(id);
        parts.push(a.name_ru, a.orig);
        if (a.w) parts.push(a.w.ru, a.w.ja, a.w.en, a.w.kana, ...a.w.aliases);
      }
      for (const id of b.translators) {
        const t = translatorInfo(id);
        parts.push(t.name_ru, t.short);
        if (t.w) parts.push(t.w.ru, t.w.en, ...t.w.aliases);
      }
      const raw = parts.filter(Boolean).join(' ');
      b._hay = norm(raw);
      b._hayRaw = raw;
    }
  }

  // ================= Цвета (для цветного варианта) =================
  // Традиционные японские цвета. Жанр задаёт кайму книжной карточки, эпоха — кайму карточки автора.
  const GENRE_COLORS = {
    'роман':        ['#2b4c7e', '藍', 'индиго'],
    'повесть':      ['#4f8a5b', '若竹', 'молодой бамбук'],
    'новеллы':      ['#b5643b', '柿', 'хурма'],
    'дзуйхицу':     ['#7d6aa8', '藤', 'глициния'],
    'моногатари':   ['#a83a4a', '紅', 'кармин'],
    'поэзия':       ['#c76a7a', '桃', 'персик'],
    'очерки':       ['#7a7a32', '鶯', 'камышевка'],
    'исследование': ['#3d4f63', '鉄紺', 'тёмная сталь'],
    'драма':        ['#8c4f2b', '樺', 'берёзовая кора'],
    'сказки':       ['#c99a2e', '山吹', 'керрия'],
    'манга':        ['#c8506a', '撫子', 'гвоздика'],
    'история':      ['#6b4f3a', '焦茶', 'жжёный чай'],
    'искусство':    ['#3f7aa0', '縹', 'небесная синь'],
    'справочник':   ['#6e6a62', '鼠', 'мышиный'],
    'учебник':      ['#7a8c4e', '柳', 'ива'],
  };
  const ERA_COLORS = {
    'Хэйан':       ['#a83a4a', '紅'],
    'Камакура':    ['#9a7a2e', '黄櫨'],
    'Муромати':    ['#3e6b63', '御納戸'],
    'Эдо':         ['#b5643b', '柿'],
    'Мэйдзи':      ['#2b4c7e', '藍'],
    'Тайсё':       ['#7d6aa8', '藤'],
    'Сёва':        ['#4f8a5b', '若竹'],
    'современность': ['#2f7f86', '青碧'],
  };
  const OTHER_COLOR = '#7a7a32';      // авторы-неяпонцы (книги о Японии)
  const TRANSLATOR_COLOR = '#6b4f7a'; // 江戸紫 — переводчики
  const genreColor = (g) => GENRE_COLORS[g]?.[0] || '#5b5b5b';
  function eraOf(authorId) {
    const a = authorsById.get(authorId);
    if (a?.era) return a.era;
    // японский автор без явной эпохи — по году рождения из Викиданных
    const born = a?.wikidata && a.name_orig ? wd[a.wikidata]?.born?.year : null;
    if (born != null) {
      if (born < 1150) return 'Хэйан';
      if (born < 1300) return 'Камакура';
      if (born < 1550) return 'Муромати';
      if (born < 1850) return 'Эдо';
      if (born < 1885) return 'Мэйдзи';
      if (born < 1905) return 'Тайсё';
      if (born < 1945) return 'Сёва';
      return 'современность';
    }
    const tags = new Set(booksOf(authorId).flatMap((b) => b.tags));
    return Object.keys(ERA_COLORS).find((e) => tags.has(e)) || null;
  }
  function personColor(p) {
    if (p.kind === 'translator') return TRANSLATOR_COLOR;
    const era = eraOf(p.id);
    return era ? ERA_COLORS[era][0] : OTHER_COLOR;
  }

  // Легенда цветов — видна только в цветном варианте
  function legend(kind) {
    if (kind === 'genre') {
      const used = new Set(catalog.books.map((b) => b.genre));
      return `<div class="legend" aria-label="Цвет каймы — жанр"><span class="legend-t">Кайма — жанр:</span>${Object.entries(GENRE_COLORS)
        .filter(([g]) => used.has(g)).map(([g, [c, kanji]]) => `<span><i style="--fc:${c}"></i>${esc(g)} <span lang="ja">${kanji}</span></span>`).join('')}</div>`;
    }
    return `<div class="legend" aria-label="Цвет каймы — эпоха"><span class="legend-t">Кайма — эпоха:</span>${Object.entries(ERA_COLORS)
      .map(([e, [c, kanji]]) => `<span><i style="--fc:${c}"></i>${esc(e)} <span lang="ja">${kanji}</span></span>`).join('')}<span><i style="--fc:${OTHER_COLOR}"></i>о Японии</span><span><i style="--fc:${TRANSLATOR_COLOR}"></i>переводчики</span></div>`;
  }

  // ================= Карточки =================
  // Торифуда — карточка книги: номер сверху, вертикальное японское название, жанр внизу.
  function fuda(b) {
    if (b.cover) return `<div class="fuda has-cover" style="--fc:${genreColor(b.genre)}"><img class="cover-img" src="${esc(b.cover)}" alt="Обложка: ${esc(b.title_ru)}" loading="lazy" referrerpolicy="no-referrer"></div>`;
    const title = b.title_orig
      ? `<span class="fuda-v" lang="ja">${esc(b.title_orig)}</span>`
      : `<span class="fuda-v ru">${esc(b.title_ru)}</span>`;
    return `<div class="fuda" style="--fc:${genreColor(b.genre)}" aria-hidden="true"><span class="fuda-no" lang="ja">${kanjiNum(bookNo.get(b.id))}</span>${title}<span class="fuda-foot">${esc(b.genre || '')}</span></div>`;
  }

  // Ёмифуда — карточка человека: портрет и вертикальное имя.
  function yomifuda(p) {
    const orig = p.orig || p.name_ru;
    const name = p.kanji
      ? `<span class="fuda-v" lang="ja">${esc(p.kanji)}</span>`
      : `<span class="fuda-v ru">${esc(orig)}</span>`;
    const img = p.w?.image || p.image;
    const pic = img
      ? `<img class="portrait" src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : `<div class="portrait none">${esc(orig[0])}</div>`;
    return `<div class="fuda yomi" style="--fc:${personColor(p)}" aria-hidden="true">${pic}${name}</div>`;
  }

  // Колода книг с подписями
  function deck(list, cls = '') {
    return `<div class="deck ${cls}">${list.map((b) => `<div>
      <a class="fuda-link" href="#/book/${b.id}">${fuda(b)}
        <div class="caption">${authorsNames(b)}<span class="t">${esc(b.title_ru)}</span></div></a>
      <div class="caption" style="margin-top:0">${imprintText(b)}${seriesOf(b) ? `<br>серия ${seriesText(b)}` : ''}${b.translators.length ? `<br>пер. ${translatorsShort(b)}` : ''}</div>
    </div>`).join('')}</div>`;
  }

  // Колода людей; marker(p) может вернуть HTML-отметку (например, букву), которая встаёт в ряд перед карточкой
  function peopleDeck(people, hrefBase, extra, marker) {
    return `<div class="deck small">${people.map((p) => `${marker ? marker(p) : ''}<a class="fuda-link" href="#/${hrefBase}/${p.id}">
      ${yomifuda(p)}
      <div class="caption"><span class="t">${esc(p.name_ru)}</span>${lifeYears(p.w)}${extra ? `<br>${extra(p)}` : ''}</div>
    </a>`).join('')}</div>`;
  }

  const section = (title) => `<h2 class="section-title">${title}</h2>`;

  // ================= Страницы =================
  function pageHome() {
    // Последние добавления — по дате внесения в каталог; новейшие издания — по году выхода
    const recent = [...catalog.books].sort((a, b) => (b.added || '').localeCompare(a.added || '') || (bookNo.get(b.id) - bookNo.get(a.id))).slice(0, 5);
    const newest = [...catalog.books].filter((b) => b.year)
      .sort((a, b) => b.year - a.year || (b.added || '').localeCompare(a.added || '') || (bookNo.get(b.id) - bookNo.get(a.id))).slice(0, 12);
    return `
      ${section('Последние добавления')}
      ${legend('genre')}
      ${deck(recent)}
      <section class="recent newest">
        ${section('Новейшие издания')}
        ${newest.map((b) => `<p><span class="when">${b.year}${b.publisher ? ` · ${esc(b.publisher)}` : ''}</span><br>${authorsNames(b)}. <a href="#/book/${b.id}">${esc(b.title_ru)}</a></p>`).join('')}
      </section>`;
  }

  function lettersPage({ title, sub, people, hrefBase, prefix, extra, params }) {
    const sorted = [...people].sort((a, b) => alphaCompare(a.sort, b.sort) || alphaCompare(a.name_ru, b.name_ru));
    const asList = params?.get('view') === 'list';
    const letterOf = (p) => p.sort[0].toUpperCase();
    const letters = [...new Set(sorted.map(letterOf))];
    let prev = null;
    const marker = (p) => {
      const L = letterOf(p);
      if (L === prev) return '';
      prev = L;
      return `<div class="letter-mark" id="${prefix}-${L}" aria-hidden="true"><span>${L}</span></div>`;
    };
    return `
      <h1>${title}</h1>
      <p class="sub">${sub}</p>
      <nav class="letters" aria-label="Буквы">${letters.map((L) => `<a href="#/${hrefBase}s" data-jump="${prefix}-${L}">${L}</a>`).join('')}</nav>
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
    </section>`).join('')}</div>`;
  }

  const pageAuthors = (params) => lettersPage({ params,
    title: 'Авторы', sub: `по русскому алфавиту · ${plural(catalog.authors.length, ['автор', 'автора', 'авторов'])}`,
    people: catalog.authors.map((a) => authorInfo(a.id)), hrefBase: 'author', prefix: 'A',
    extra: (p) => {
      const nb = booksOf(p.id).length, nw = worksOf(p.id).length;
      return [nb && plural(nb, ['издание', 'издания', 'изданий']), nw && plural(nw, ['произведение', 'произведения', 'произведений'])].filter(Boolean).join(' · ');
    },
  });

  const pageTranslators = (params) => lettersPage({ params,
    title: 'Переводчики', sub: `по русскому алфавиту · ${plural(catalog.translators.length, ['переводчик', 'переводчика', 'переводчиков'])}`,
    people: catalog.translators.map((t) => translatorInfo(t.id)), hrefBase: 'translator', prefix: 'T',
    extra: (p) => {
      const books = translationsOf(p.id);
      return `${plural(books.length, ['перевод', 'перевода', 'переводов'])}: ${[...new Set(books.flatMap((b) => b.authors))].map((a) => esc(authorInfo(a).name_ru)).join(', ')}`;
    },
  });

  function profile(p, hash, role) {
    const w = p.w;
    const facts = [
      p.kind === 'author' && ['Имя на русском', esc(p.name_ru)],
      p.kind === 'translator' && w?.ru && norm(w.ru).includes(norm(p.sort)) && norm(w.ru) !== norm(p.name_ru) && ['Полное имя', esc(w.ru.replace(',', ''))],
      w?.ru && !norm(w.ru).includes(norm(p.sort)) && !norm(w.ru).includes(norm(p.name_ru.split(' ').pop())) && ['Также известен(а) как', esc(w.ru)],
      p.kind === 'author' && !p.kanji && p.orig !== p.name_ru && ['Имя в оригинале', esc(p.orig)],
      w?.en && w.en !== p.orig && ['Латиницей', esc(w.en)],
      p.kanji && ['По-японски', `<span lang="ja">${esc(p.kanji)}</span>${w?.kana ? ` <span lang="ja">（${esc(w.kana)}）</span>` : ''}`],
      (w?.born || w?.died) && ['Годы жизни', `${w.born ? w.born.text : '?'}${w.died ? ` – ${w.died.text}` : ''}`],
      w?.birthplace && ['Место рождения', esc(w.birthplace)],
    ].filter(Boolean);
    const links = extLinks(p);
    return `<div class="profile">
      ${yomifuda(p)}
      <div>
        <h1>${esc(p.name_ru)}</h1>
        ${p.kanji ? `<p class="orig" lang="ja">${esc(p.kanji)}</p>` : p.orig && p.orig !== p.name_ru ? `<p class="orig">${esc(p.orig)}</p>` : ''}
        <p class="role">${role}</p>
        <div class="facts">${facts.map(([k, v]) => `<b>${k}:</b> ${v}`).join('<br>')}</div>
        <div class="bio" id="bio">${bioHtml(p, hash)}</div>
        ${links ? `<p class="small">${links}</p>` : ''}
      </div>
    </div>`;
  }

  function pageAuthor(id) {
    if (!authorsById.has(id)) return notFound();
    const a = authorInfo(id);
    // hide_on_author: издание показано в разделе «Другое издание» другой карточки, в списке автора не повторяем
    const books = booksOf(id).filter((b) => !b.hide_on_author).sort((x, y) => (x.year || 9999) - (y.year || 9999));
    const works = new Map();
    for (const b of books) {
      const key = b.title_orig || b.title_ru;
      if (!works.has(key)) works.set(key, []);
      works.get(key).push(b);
    }
    return `
      ${profile(a, `#/author/${id}`, 'автор')}
      ${section(`Издания на русском · ${books.length}`)}
      ${[...works.values()].map((eds) => {
        const b = eds[0];
        return `<div class="work-row">
          <a href="#/book/${b.id}">${fuda(b)}</a>
          <div>
            <div class="meta">${esc(b.genre)}${b.orig_year ? ` · ${esc(b.orig_year)}` : ''}</div>
            <h3>${esc(b.title_ru)}</h3>
            ${b.title_orig ? `<div><span lang="ja">${esc(b.title_orig)}</span>${b.title_romaji ? ` <span class="romaji">${esc(b.title_romaji)}</span>` : ''}</div>` : ''}
            ${b.work_note ? `<p>${esc(b.work_note)}</p>` : ''}
            <ul class="ed-list">${eds.map((e) => `<li><a href="#/book/${e.id}">${esc(e.title_ru)}</a> — ${imprintText(e)}${seriesOf(e) ? `; серия ${seriesText(e)}` : ''}${e.isbn ? `; ISBN ${esc(e.isbn)}` : ''}${e.translators.length ? `; пер. ${translatorsShort(e)}` : ''}</li>`).join('')}</ul>
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
        <span class="w">${workTitleLink(w)}</span>
        ${w.title_orig ? ` <span${w.foreign ? '' : ' lang="ja"'}>${esc(w.title_orig)}</span>` : ''}${w.title_romaji ? ` <span class="romaji">${esc(w.title_romaji)}</span>` : ''}
        ${w.kind ? ` <span class="k">${esc(w.kind)}</span>` : ''}</li>`).join('')}</ul>`;
  }

  function pageTranslator(id) {
    if (!translatorsById.has(id)) return notFound();
    const t = translatorInfo(id);
    const books = translationsOf(id).sort((x, y) => (x.year || 9999) - (y.year || 9999));
    const byAuthor = new Map();
    // В сборнике учитываем только тех авторов, чьи вещи перевёл именно этот переводчик
    const ANON = '_anon';
    for (const b of books) {
      const authors = b.contents
        ? [...new Set(b.contents.filter((w) => w.tr.includes(id)).map((w) => w.a || ANON))]
        : b.authors;
      for (const a of authors) {
        if (!byAuthor.has(a)) byAuthor.set(a, []);
        byAuthor.get(a).push(b);
      }
    }
    const sortKey = (a) => (a === ANON ? 'яяя' : authorsById.get(a)?.sort || a);
    const order = [...byAuthor.keys()].sort((a, b) => collator.compare(sortKey(a), sortKey(b)));
    const works = (b) => (b.contents || []).filter((w) => w.tr.includes(id));
    return `
      ${profile(t, `#/translator/${id}`, 'переводчик')}
      ${section(`Переводы · ${plural(books.length, ['книга', 'книги', 'книг'])}`)}
      ${order.map((a) => `${section(a === ANON ? 'Анонимные произведения' : authorLink(a))}${deck(byAuthor.get(a))}
        ${byAuthor.get(a).some((b) => b.contents) ? `<ul class="ed-list">${byAuthor.get(a).filter((b) => b.contents).map((b) =>
          `<li><a href="#/book/${b.id}">${esc(b.title_ru)}</a>: ${works(b).filter((w) => (w.a || ANON) === a).map((w) => `«${esc(w.t.replace(/^«|»$/g, ''))}»`).join(', ')}</li>`).join('')}</ul>` : ''}`).join('')}`;
  }

  function pageWorks(params) {
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
      // год создания: без года — в конце списка
      year: (x, y) => (x.year ?? 99999) - (y.year ?? 99999) || collator.compare(firstSort(x), firstSort(y)) || collator.compare(x.title_ru, y.title_ru),
    }[sort] || (() => 0);
    rows = rows.sort(cmp);
    const th = (key, label, cls = '') => `<th class="${cls}"><button type="button" data-works-sort="${key}">${label}${sort === key ? ' ▾' : ''}</button></th>`;
    const jp = rows.filter((w) => !w.foreign), fr = rows.filter((w) => w.foreign);
    const nJp = all.filter((w) => !w.foreign).length, nFr = all.length - nJp;
    const table = (list, foreign) => (list.length ? `<table class="list">
        <thead><tr>${th('title', 'Название')}<th class="hide-sm">Оригинал</th>${th('author', 'Автор')}${th('year', 'Год', 'num')}${foreign ? '<th class="hide-sm">Язык</th>' : ''}${th('kind', 'Вид')}</tr></thead>
        <tbody>${list.map((w) => `<tr>
          <td>${workTitleLink(w)}</td>
          <td class="hide-sm"${foreign ? '' : ' lang="ja"'}>${esc(w.title_orig || w.title_romaji || '—')}</td>
          <td>${w.authors.map(authorLink).join(', ') || '—'}</td>
          <td class="num">${w.year != null ? (w.year < 0 ? `${-w.year} до н. э.` : w.year) : '—'}</td>
          ${foreign ? `<td class="hide-sm">${esc(w.lang || '—')}</td>` : ''}
          <td>${esc(w.kind || '—')}</td></tr>`).join('')}</tbody>
      </table>` : '<p class="muted">Ничего не найдено.</p>');
    return `
      <h1>Произведения</h1>
      <p class="sub">художественные произведения на русском языке · ${plural(all.length, ['произведение', 'произведения', 'произведений'])} · по данным Фантлаба, картотеки и издательств</p>
      <form class="searchbar" id="works-form">
        <input id="wq" type="search" value="${esc(q)}" placeholder="Название, автор или иероглифы" aria-label="Поиск по произведениям" autocomplete="off">
        <select id="wkind" aria-label="Вид произведения"><option value="">все виды</option>${kinds.map((k) => `<option value="${esc(k)}" ${k === kind ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>
      </form>
      ${section(`Японские авторы · ${jp.length === nJp ? nJp : `${jp.length} из ${nJp}`}`)}
      ${table(jp, false)}
      ${section(`Неяпонские авторы · ${fr.length === nFr ? nFr : `${fr.length} из ${nFr}`}`)}
      ${table(fr, true)}`;
  }

  // Название произведения: японские — ссылка на Фантлаб, остальные — на издание в каталоге
  const workTitleLink = (w) => (w.fantlab ? `<a href="https://fantlab.ru/work${w.fantlab}" target="_blank" rel="noopener">${esc(w.title_ru)}</a>`
    : w.books?.length ? `<a href="#/book/${esc(w.books[0])}">${esc(w.title_ru)}</a>` : esc(w.title_ru));

  // Ссылка на страницу с теми же параметрами, изменёнными через mut
  const hrefWith = (page, params, mut) => {
    const p = new URLSearchParams(params);
    mut(p);
    [...p.keys()].forEach((k) => { if (!p.get(k)) p.delete(k); });
    const qs = p.toString();
    return `#/${page}${qs ? `?${qs}` : ''}`;
  };
  const switchGroup = (items, cur) => `<div class="view-switch" role="group">${items.map(([k, label, h]) => `<a href="${h}" ${k === cur ? 'aria-current="true"' : ''}>${label}</a>`).join('')}</div>`;
  const viewSwitch = (page, params) => switchGroup([
    ['cards', 'Карточки', hrefWith(page, params, (p) => p.delete('view'))],
    ['list', 'Список', hrefWith(page, params, (p) => p.set('view', 'list'))],
  ], params.get('view') === 'list' ? 'list' : 'cards');
  // Сортировка книг: по автору, названию, году издания, издательству
  const titleKeyOf = (b) => (b.title_ru || '').replace(/^[«"„'(\[\s]+/, '');
  const byBookTitle = (x, y) => alphaCompare(titleKeyOf(x), titleKeyOf(y)) || (x.year || 0) - (y.year || 0);
  const BOOK_SORTS = {
    author: (x, y) => (!x.authors.length - !y.authors.length) || alphaCompare(firstAuthorSort(x), firstAuthorSort(y)) || (x.year || 0) - (y.year || 0) || byBookTitle(x, y),
    title: byBookTitle,
    year: (x, y) => (x.year ?? 99999) - (y.year ?? 99999) || byBookTitle(x, y),
    publisher: (x, y) => (!x.publisher - !y.publisher) || collator.compare(x.publisher || '', y.publisher || '') || (x.year || 0) - (y.year || 0) || byBookTitle(x, y),
  };
  const sortOf = (params) => (BOOK_SORTS[params.get('sort')] ? params.get('sort') : 'author');
  const sortSwitch = (page, params) => `<span class="ed-sort-label">Сортировка:</span>${switchGroup([
    ['author', 'по автору', hrefWith(page, params, (p) => p.delete('sort'))],
    ['title', 'по названию', hrefWith(page, params, (p) => p.set('sort', 'title'))],
    ['year', 'по году издания', hrefWith(page, params, (p) => p.set('sort', 'year'))],
    ['publisher', 'по издательству', hrefWith(page, params, (p) => p.set('sort', 'publisher'))],
  ], sortOf(params))}`;

  // Таблица изданий; groups — [[заголовок группы или null, книги], …]
  const booksTable = (groups, gid = () => '') => `<table class="list ed-table">
      <thead><tr><th>Название</th><th>Автор</th><th class="hide-sm">Издательство</th><th class="num">Год</th><th class="hide-sm">Серия</th></tr></thead>
      ${groups.map(([g, list]) => `<tbody>${g ? `<tr class="grp" id="${gid(g)}"><th colspan="5">${esc(g)}</th></tr>` : ''}${list.map((b) => `<tr>
        <td><a href="#/book/${b.id}">${esc(b.title_ru)}</a></td>
        <td>${authorsNames(b) || '—'}</td>
        <td class="hide-sm">${esc([b.publisher, b.city].filter(Boolean).join(', ') || '—')}</td>
        <td class="num">${b.year || '—'}</td>
        <td class="hide-sm">${seriesOf(b) ? seriesText(b) : '—'}</td></tr>`).join('')}</tbody>`).join('')}
    </table>`;

  // Издания: все книги карточками или списком; сортировка по алфавиту, году или издательству; фильтр по году
  function pageEditions(year, params) {
    const view = params.get('view') === 'list' ? 'list' : 'cards';
    const sort = ['year', 'publisher'].includes(params.get('sort')) ? params.get('sort') : 'title';
    const href = (mut) => {
      const p = new URLSearchParams({ ...(view === 'list' ? { view } : {}), ...(sort !== 'title' ? { sort } : {}) });
      mut(p);
      const qs = p.toString();
      return `#/editions${year ? `/${year}` : ''}${qs ? `?${qs}` : ''}`;
    };
    const yearHref = (y) => { const p = new URLSearchParams(location.hash.split('?')[1] || ''); const qs = p.toString(); return `#/editions${y ? `/${y}` : ''}${qs ? `?${qs}` : ''}`; };

    // сетка годов — фильтр
    // все годы, за которые в каталоге есть издания, по порядку
    const grid = [...new Set(catalog.books.map((b) => b.year).filter(Boolean))].sort((a, b) => a - b)
      .map((y) => `<a href="${yearHref(y)}" ${String(y) === year ? 'aria-current="true"' : ''}>${y}</a>`).join('');

    const titleKey = (b) => (b.title_ru || '').replace(/^[«"„'(\[\s]+/, '');
    const books = catalog.books.filter((b) => !year || (year === 'early' ? b.year && b.year < 1950 : b.year === +year));
    const byTitle = (x, y) => alphaCompare(titleKey(x), titleKey(y)) || (x.year || 0) - (y.year || 0);
    const cmp = {
      title: byTitle,
      year: (x, y) => (x.year ?? 99999) - (y.year ?? 99999) || byTitle(x, y),
      publisher: (x, y) => (!x.publisher - !y.publisher) || collator.compare(x.publisher || '', y.publisher || '') || (x.year || 0) - (y.year || 0) || byTitle(x, y),
    }[sort];
    books.sort(cmp);
    const groupOf = {
      title: (b) => { const c = titleKey(b)[0]?.toUpperCase() || '?'; return ALPHABET.includes(c) ? c : /[A-Z]/.test(c) ? 'A–Z' : /\d/.test(c) ? '0–9' : c; },
      year: (b) => (b.year ? String(b.year) : 'год не указан'),
      publisher: (b) => b.publisher || 'издательство не указано',
    }[sort];
    const groups = [];
    for (const b of books) {
      const g = groupOf(b);
      if (!groups.length || groups[groups.length - 1][0] !== g) groups.push([g, []]);
      groups[groups.length - 1][1].push(b);
    }
    const gid = (g) => `E-${g.replace(/[^\wА-ЯЁа-яё]+/g, '_')}`;
    const jumpNav = sort === 'title'
      ? `<nav class="letters" aria-label="Буквы">${groups.map(([g]) => `<a href="${href(() => {})}" data-jump="${gid(g)}">${esc(g)}</a>`).join('')}</nav>` : '';

    const sw = switchGroup;
    const controls = `<div class="ed-controls">
      ${sw([['cards', 'Карточки', href((p) => p.delete('view'))], ['list', 'Список', href((p) => p.set('view', 'list'))]], view)}
      <span class="ed-sort-label">Сортировка:</span>
      ${sw([['title', 'по алфавиту', href((p) => p.delete('sort'))], ['year', 'по году издания', href((p) => p.set('sort', 'year'))], ['publisher', 'по издательству', href((p) => p.set('sort', 'publisher'))]], sort)}
    </div>`;

    const body = !books.length ? '<p>За этот год изданий пока нет.</p>'
      : view === 'cards'
        ? `${legend('genre')}${groups.map(([g, list]) => `<h3 class="group-h" id="${gid(g)}">${esc(g)} <span>${list.length}</span></h3>${deck(list)}`).join('')}`
        : booksTable(groups, gid);

    return `<h1>Издания</h1>
      <p class="sub">${plural(books.length, ['издание', 'издания', 'изданий'])}${year ? ` · ${year === 'early' ? 'до 1950 года' : `${esc(year)} год`} · <a href="${yearHref('')}">все годы</a>` : ''}</p>
      ${controls}
      <details class="year-filter"${year ? ' open' : ''}><summary>Выбрать год издания</summary><div class="years">${grid}</div></details>
      ${jumpNav}
      ${body}`;
  }

  function pageSearch(params) {
    const q = params.get('q') || '';
    const tags = new Set((params.get('tags') || '').split(',').filter(Boolean));
    const tokens = q.trim().split(/\s+/).filter(Boolean);
    const match = (b) => [...tags].every((t) => b.tags.includes(t)) &&
      tokens.every((tok) => { const n = norm(tok); return (n && b._hay.includes(n)) || b._hayRaw.includes(tok); });
    const found = catalog.books.filter(match).sort(BOOK_SORTS[sortOf(params)]);

    const counts = new Map();
    for (const b of found) for (const t of b.tags) counts.set(t, (counts.get(t) || 0) + 1);
    const all = [...new Set([...catalog.books.flatMap((b) => b.tags), ...ALWAYS_TAGS])];
    const btn = (t) => {
      const n = counts.get(t) || 0, on = tags.has(t);
      return `<button type="button" data-tag="${esc(t)}" aria-pressed="${on}" ${!n && !on ? 'disabled' : ''}>${esc(t)} · ${n}</button>`;
    };
    const other = all.filter((t) => !TYPE_TAGS.includes(t)).sort((a, b) => collator.compare(a, b));
    return `
      <h1>Поиск</h1>
      <p class="sub">по автору, названию, иероглифам, ромадзи, переводчику, издательству</p>
      <form class="searchbar" id="search-form">
        <input id="q" type="search" value="${esc(q)}" placeholder="Например: Мишима, 雪国, Murakami, Маркова" aria-label="Поиск" autocomplete="off">
      </form>
      <div class="tagcloud">
        <span class="grp">Тип</span>${TYPE_TAGS.filter((t) => all.includes(t)).map(btn).join('')}
        <span class="grp">Теги</span>${other.map(btn).join('')}
      </div>
      <div class="ed-controls"><p class="found" style="margin:0">Найдено: ${found.length} из ${catalog.books.length}</p>${viewSwitch('search', params)}${sortSwitch('search', params)}</div>
      ${!found.length ? '<p>Ничего не найдено. Попробуйте снять часть тегов.</p>'
        : params.get('view') === 'list' ? booksTable([[null, found]]) : `${legend('genre')}${deck(found)}`}`;
  }

  function pageBook(id) {
    const b = catalog.books.find((x) => x.id === id);
    if (!b) return notFound();
    const rows = [
      b.authors.length && [b.authors.length > 1 ? 'Авторы' : 'Автор', b.authors.map((aid) => { const a = authorInfo(aid); return `${authorLink(aid)}${a.kanji ? ` <span lang="ja">${esc(a.kanji)}</span>` : ''}`; }).join(', ')],
      b.title_orig && ['Оригинал', `<span lang="ja">${esc(b.title_orig)}</span>${b.title_romaji ? ` (<i>${esc(b.title_romaji)}</i>)` : ''}`],
      b.orig_year && ['Год оригинала', esc(b.orig_year)],
      b.translators.length && ['Перевод', b.translators.map((t) => translatorLink(t, true)).join(', ')],
      b.city && ['Место издания', esc(b.city)],
      b.publisher && ['Издательство', esc(b.publisher)],
      ['Год издания', b.year ? `<a href="#/editions/${b.year}">${b.year}</a>` : 'не указан'],
      b.pages && ['Страниц', b.pages],
      seriesOf(b) && ['Серия', seriesText(b)],
      ['ISBN', b.isbn ? esc(b.isbn) : '<span class="muted">не указан</span>'],
      b.print_run && ['Тираж', `${b.print_run.toLocaleString('ru-RU')} экз.`],
      ['Жанр', esc(b.genre)],
      ['Теги', b.tags.map((t) => `<a href="#/search?tags=${encodeURIComponent(t)}">${esc(t)}</a>`).join(', ')],
      ['Карточка', `<span lang="ja">${kanjiNum(bookNo.get(b.id))}</span> (№ ${bookNo.get(b.id)})`],
      (b.source || b.sources) && ['Источник', [
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
      : `${section(`Содержание · ${items.length}`)}${list}`) : '';
    return `
      <div class="profile">
        ${fuda(b)}
        <div>
          <h1>${esc(b.title_ru)}</h1>
          ${b.title_orig ? `<p class="orig" lang="ja">${esc(b.title_orig)}</p>` : ''}
          ${b.work_note ? `<p>${esc(b.work_note)}</p>` : ''}
          <table class="card">${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>
        </div>
      </div>
      ${contents}
      ${otherEditions(b)}
      <p class="back"><a href="javascript:history.back()">← назад</a></p>`;
  }

  // Другие издания той же книги (поле editions): обложка и выходные данные
  function otherEditions(b) {
    const eds = b.editions || [];
    if (!eds.length) return '';
    return `${section(eds.length > 1 ? `Другие издания · ${eds.length}` : 'Другое издание')}${eds.map((e) => {
      const rows = [
        e.title && ['Название', esc(e.title)],
        e.city && ['Место издания', esc(e.city)],
        e.publisher && ['Издательство', esc(e.publisher)],
        e.year && ['Год издания', `<a href="#/editions/${esc(e.year)}">${esc(e.year)}</a>`],
        e.pages && ['Страниц', esc(e.pages)],
        e.isbn && ['ISBN', esc(e.isbn)],
        e.size && ['Формат', esc(e.size)],
        e.binding && ['Обложка', esc(e.binding)],
        e.note && ['Примечание', esc(e.note)],
        e.book && bookNo.has(e.book) && ['Карточка', `<a href="#/book/${esc(e.book)}"><span lang="ja">${kanjiNum(bookNo.get(e.book))}</span> (№ ${bookNo.get(e.book)})</a>`],
        e.source && ['Источник', `<a href="${esc(e.source)}" target="_blank" rel="noopener">${esc(sourceName(e.source))}</a>`],
      ].filter(Boolean);
      return `<div class="edition-other">
        ${e.cover ? `<img class="ed-cover" src="${esc(e.cover)}" alt="Обложка издания ${esc(e.year || '')} года" loading="lazy" referrerpolicy="no-referrer">` : '<div></div>'}
        <table class="card">${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>
      </div>`;
    }).join('')}`;
  }

  function pageNonfiction(params) {
    const books = catalog.books.filter((b) => b.tags.includes('нехудожественная'));
    // сортировка внутри разделов: по автору (по умолчанию), названию, году издания, издательству
    const cmp = BOOK_SORTS[sortOf(params)];
    // разделы в постоянном порядке, независимо от сортировки
    const ORDER = ['история', 'исследование', 'искусство', 'очерки', 'справочник', 'учебник'];
    const groups = new Map();
    for (const b of [...books].sort((x, y) => {
      const gx = ORDER.indexOf(x.genre), gy = ORDER.indexOf(y.genre);
      return (gx < 0 ? 99 : gx) - (gy < 0 ? 99 : gy) || collator.compare(x.genre || '', y.genre || '') || cmp(x, y);
    })) {
      const g = b.genre || 'другое';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(b);
    }
    const topics = [...new Set([...books.flatMap((b) => b.tags.filter((t) => !TYPE_TAGS.includes(t))), ...TOPIC_TAGS])].sort((a, b) => collator.compare(a, b));
    const nTopic = (t) => books.filter((b) => b.tags.includes(t)).length;
    const asList = params.get('view') === 'list';
    const groupTitle = (g) => ({ 'исследование': 'Исследования', 'очерки': 'Очерки и публицистика', 'история': 'История', 'искусство': 'Искусство',
      'справочник': 'Справочники и словари', 'учебник': 'Учебники и разговорники' }[g] || g[0].toUpperCase() + g.slice(1));
    return `
      <h1>Нехудожественная литература</h1>
      <p class="sub">исследования, очерки, справочные издания о Японии · ${plural(books.length, ['книга', 'книги', 'книг'])}</p>
      <div class="tagcloud"><span class="grp">Темы</span>${topics.map((t) => (nTopic(t)
        ? `<a href="#/search?tags=${encodeURIComponent('нехудожественная,' + t)}${asList ? '&view=list' : ''}">${esc(t)} · ${nTopic(t)}</a>`
        : `<span class="tag-off">${esc(t)} · 0</span>`)).join('')}</div>
      <div class="ed-controls">${viewSwitch('nonfiction', params)}${sortSwitch('nonfiction', params)}</div>
      ${asList ? [...groups].map(([g, list]) => `${section(`${esc(groupTitle(g))} · ${list.length}`)}${booksTable([[null, list]])}`).join('')
        : [...groups].map(([g, list]) => `${section(esc(groupTitle(g)))}${deck(list)}`).join('')}`;
  }

  function pageSeries(id) {
    const s = catalog.series.find((x) => x.id === id);
    if (!s) return notFound();
    const books = catalog.books.filter((b) => b.series?.id === id).sort((x, y) => (x.series.no || 0) - (y.series.no || 0) || x.year - y.year);
    return `
      <h1>«${esc(s.name)}»</h1>
      <p class="sub">книжная серия · «${esc(s.publisher)}», ${esc(s.city)}, ${esc(s.years)} · ${plural(books.length, ['том', 'тома', 'томов'])}</p>
      ${s.note ? `<p>${esc(s.note)}</p>` : ''}
      ${s.source ? `<p class="small">Источник: <a href="${esc(s.source)}" target="_blank" rel="noopener">Фантлаб</a></p>` : ''}
      ${section('Тома по порядку')}
      ${legend('genre')}
      ${deck(books)}`;
  }

  const pageAbout = () => `
    <h1>О сайте</h1>
    <p class="sub">прототип</p>
    <p>«Библиография русскоязычной японской литературы» — каталог книг, изданных на русском языке: переводов японских авторов и книг о Японии, написанных по-русски.</p>
    <p>Оформление навеяно карутой — японской карточной игрой. Каждая книга здесь — карточка-торифуда с японским названием и порядковым номером, записанным японскими цифрами, как на карточках «Хякунин иссю». Авторы и переводчики — карточки-ёмифуда с портретом.</p>
    <p>Выходные данные изданий хранятся в собственной базе сайта. Сведения о людях — имена иероглифами и каной, латиницей, годы и место рождения, портреты — подгружаются из <a href="https://www.wikidata.org" target="_blank" rel="noopener">Викиданных</a>, краткие биографии — из <a href="https://ru.wikipedia.org" target="_blank" rel="noopener">Википедии</a>.</p>
    <p>Книги внесены по картотеке и таблице составителя и открытым источникам: <a href="https://fantlab.ru" target="_blank" rel="noopener">Фантлаб</a> (серия «Библиотека японской литературы», переводы Е. А. Рябовой и Е. М. Байбиковой, поиск произведений японских авторов), сайты издательств «Азбука», «Бомбора», «Поляндрия NoAge», МИФ, «Лабиринт» (серия Orientalia et Classica, книги издательства «Гиперион»), LiveLib, сайт ВШЭ (книги В. В. Щепкина и А. Н. Мещерякова) и Википедия (книги Е. С. Штейнера и А. Н. Мещерякова). Обложки показываются с сайтов-источников.</p>
    <p>В каталог входят: художественные книги японских авторов в русском переводе, художественные книги о Японии авторов из других стран и России, нехудожественные книги о Японии — история, культура, мифология, искусство, язык. Не входят практические пособия (рукоделие, кулинария, здоровье), раскраски, блокноты, путеводители и подарочные комплекты.</p>`;

  const notFound = () => '<h1>Страница не найдена</h1><p><a href="#/">На главную</a></p>';

  // ================= Маршрутизация =================
  function route() {
    const [path, qs] = (location.hash.replace(/^#/, '') || '/').split('?');
    const params = new URLSearchParams(qs || '');
    const parts = path.split('/').filter(Boolean);
    const sec = parts[0] || '';
    let html, title = '';
    switch (sec) {
      case '': html = pageHome(); break;
      case 'authors': html = pageAuthors(params); title = 'Авторы'; break;
      case 'author': html = pageAuthor(parts[1]); title = authorsById.get(parts[1])?.name_ru || ''; break;
      case 'translators': html = pageTranslators(params); title = 'Переводчики'; break;
      case 'translator': html = pageTranslator(parts[1]); title = translatorsById.get(parts[1])?.name_ru || ''; break;
      case 'works': html = pageWorks(params); title = 'Произведения'; break;
      case 'editions': html = pageEditions(parts[1], params); title = 'Издания'; break;
      case 'nonfiction': html = pageNonfiction(params); title = 'Нехудожественная литература'; break;
      case 'search': html = pageSearch(params); title = 'Поиск'; break;
      case 'book': html = pageBook(parts[1]); title = catalog.books.find((b) => b.id === parts[1])?.title_ru || ''; break;
      case 'series': html = pageSeries(parts[1]); title = catalog.series.find((s) => s.id === parts[1])?.name || ''; break;
      case 'about': html = pageAbout(); title = 'О сайте'; break;
      default: html = notFound();
    }
    app.innerHTML = html;
    document.title = (title ? `${title} — ` : '') + 'Библиография японской литературы';

    const navKey = { author: 'authors', translator: 'translators', book: '-' }[sec] ?? sec;
    document.querySelectorAll('.topnav a').forEach((a) => {
      const on = a.getAttribute('href').replace(/^#\/?/, '') === navKey;
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });

    document.getElementById('wd-status').textContent = {
      loading: 'Викиданные: загрузка…',
      ok: `Викиданные: загружено записей — ${Object.keys(wd).length}`,
      partial: 'Викиданные: часть сведений из кэша',
      error: 'Викиданные недоступны — показаны только данные каталога',
    }[wdState];
  }

  // Поиск и фильтры: обновляем адрес и перерисовываем, сохраняя фокус в поле ввода
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
    if (e.target.id === 'wkind') setParams('works', (p) => p.set('kind', e.target.value));
  });
  document.addEventListener('submit', (e) => { if (e.target.id === 'search-form' || e.target.id === 'works-form') e.preventDefault(); });
  document.addEventListener('click', (e) => {
    const tag = e.target.closest('[data-tag]');
    if (tag) {
      setSearch((p) => {
        const s = new Set((p.get('tags') || '').split(',').filter(Boolean));
        s.has(tag.dataset.tag) ? s.delete(tag.dataset.tag) : s.add(tag.dataset.tag);
        p.set('tags', [...s].join(','));
      });
      return;
    }
    const ws = e.target.closest('[data-works-sort]');
    if (ws) { setParams('works', (p) => p.set('sort', ws.dataset.worksSort)); return; }
    const jump = e.target.closest('[data-jump]');
    if (jump) { e.preventDefault(); document.getElementById(jump.dataset.jump)?.scrollIntoView({ behavior: 'smooth' }); }
  });
  window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

  // Переключатель «Цвет / Монохром»; выбор запоминается в браузере
  const toggle = document.getElementById('palette-toggle');
  function syncToggle() {
    const color = document.documentElement.dataset.palette === 'color';
    toggle.setAttribute('aria-pressed', String(color));
    toggle.querySelector('.lbl').textContent = color ? 'Монохром' : 'Цвет';
    toggle.title = color ? 'Переключить на монохромный вариант' : 'Переключить на цветной вариант';
  }
  toggle.addEventListener('click', () => {
    const color = document.documentElement.dataset.palette !== 'color';
    if (color) document.documentElement.dataset.palette = 'color'; else delete document.documentElement.dataset.palette;
    try { localStorage.setItem('palette', color ? 'color' : 'mono'); } catch { /* недоступно */ }
    syncToggle();
  });
  syncToggle();

  // ================= Старт =================
  fetch('data/catalog.json', { cache: 'no-cache' })
    .then((r) => r.json())
    .then((data) => {
      catalog = { translators: [], news: [], series: [], ...data };
      authorsById = new Map(catalog.authors.map((a) => [a.id, a]));
      translatorsById = new Map(catalog.translators.map((t) => [t.id, t]));
      bookNo = new Map(catalog.books.map((b, i) => [b.id, i + 1]));
      buildIndex();
      route();
      loadWikidata();
    })
    .catch((err) => {
      app.innerHTML = '<p>Не удалось загрузить data/catalog.json. Откройте сайт через локальный сервер.</p>';
      console.error(err);
    });
})();
