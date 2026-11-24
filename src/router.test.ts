// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { hrefWith, navKeyOf, parseRoute, replaceParams } from './router';

describe('parseRoute', () => {
  it('главная', () => expect(parseRoute('')).toMatchObject({ section: '', parts: [] }));
  it('раздел, id и параметры', () => {
    const r = parseRoute('#/editions/1974?view=list&sort=year');
    expect(r.section).toBe('editions');
    expect(r.parts).toEqual(['editions', '1974']);
    expect(r.params.get('view')).toBe('list');
    expect(r.params.get('sort')).toBe('year');
  });
  it('кириллица в параметрах', () => {
    expect(parseRoute('#/search?q=%D0%BC%D0%B0%D0%BD%D0%B3%D0%B0').params.get('q')).toBe('манга');
  });
});

describe('hrefWith', () => {
  it('меняет параметры и убирает пустые', () => {
    const p = new URLSearchParams('q=мисима&view=list');
    expect(hrefWith('search', p, (x) => x.set('sort', 'year'))).toBe('#/search?q=%D0%BC%D0%B8%D1%81%D0%B8%D0%BC%D0%B0&view=list&sort=year');
    expect(hrefWith('search', p, (x) => x.delete('view'))).toBe('#/search?q=%D0%BC%D0%B8%D1%81%D0%B8%D0%BC%D0%B0');
    expect(hrefWith('search', new URLSearchParams('q='), () => {})).toBe('#/search');
  });
  it('не меняет исходные параметры', () => {
    const p = new URLSearchParams('a=1');
    hrefWith('x', p, (x) => x.set('a', '2'));
    expect(p.get('a')).toBe('1');
  });
});

describe('replaceParams', () => {
  it('меняет адрес без новой записи в истории и сообщает подписчикам', () => {
    location.hash = '#/search?q=a';
    const before = history.length;
    const onReplace = vi.fn();
    window.addEventListener('hash-replace', onReplace);
    replaceParams('search', (p) => { p.set('q', 'мураками'); p.set('tags', ''); });
    expect(location.hash).toBe('#/search?q=%D0%BC%D1%83%D1%80%D0%B0%D0%BA%D0%B0%D0%BC%D0%B8');
    expect(history.length).toBe(before);
    expect(onReplace).toHaveBeenCalledOnce();
  });
});

describe('пункт меню', () => {
  it('страницы автора и переводчика подсвечивают перечни, книга — ничего', () => {
    expect(navKeyOf('author')).toBe('authors');
    expect(navKeyOf('translator')).toBe('translators');
    expect(navKeyOf('book')).toBe('-');
    expect(navKeyOf('works')).toBe('works');
    expect(navKeyOf('')).toBe('');
  });
});
