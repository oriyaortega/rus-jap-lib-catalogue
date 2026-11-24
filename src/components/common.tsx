// Мелкие общие элементы: заголовок раздела, внешняя ссылка, список через разделитель
import { Fragment, type ReactNode } from 'react';

export const SectionTitle = ({ children }: { children: ReactNode }) => <h2 className="section-title">{children}</h2>;

export const ExtLink = ({ href, children, lang }: { href: string; children: ReactNode; lang?: string }) => (
  <a href={href} target="_blank" rel="noopener" lang={lang}>{children}</a>
);

// Элементы через разделитель (аналог join(', ')); пустые пропускаются
export function Join({ items, sep = ', ' }: { items: ReactNode[]; sep?: ReactNode }) {
  const list = items.filter((x) => x !== null && x !== undefined && x !== false && x !== '');
  return <>{list.map((x, i) => <Fragment key={i}>{i > 0 && sep}{x}</Fragment>)}</>;
}

// Таблица «поле — значение» (карточка книги, другое издание)
export function FactTable({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <table className="card">
      <tbody>{rows.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody>
    </table>
  );
}
