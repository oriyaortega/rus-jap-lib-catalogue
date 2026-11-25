import { ExtLink } from '../components/common';

export function AboutPage() {
  return (
    <>
      <h1>О сайте</h1>
      <p>«Библиография русскоязычной японской литературы» — это каталог книг, изданных на русском языке: художественных и не художественных текстов, оригинальной и переводной литературы. За основу взяты три издания «Библиография Японии» с 1734 по 1917, с 1917 по 1958 и с 1959 по 1973 гг. Вдохновением послужил сайт <ExtLink href="http://hkcinema.gotar.ru/">База данных китайской литературы</ExtLink>.</p>
      <p>Оформление сайта навеяно карутой — японской карточной игрой. Каждая книга здесь — карточка-торифуда с японским названием и порядковым номером, записанным японскими цифрами, как на карточках «Хякунин иссю». Авторы и переводчики — карточки-ёмифуда с портретом.</p>
      <p>Выходные данные изданий хранятся в собственной базе сайта. Сведения о людях — имена иероглифами и каной, латиницей, годы и место рождения, портреты — подгружаются, в основном, из <ExtLink href="https://www.wikidata.org">Викиданных</ExtLink>, краткие биографии — из <ExtLink href="https://ru.wikipedia.org">Википедии</ExtLink>.</p>
      <p>Книги внесены по картотеке и таблице составителя и открытым источникам: <ExtLink href="https://fantlab.ru">Фантлаб</ExtLink>, сайты издательств <ExtLink href="https://azbooka.ru">«Азбука»</ExtLink>, <ExtLink href="https://bombora.ru">«Бомбора»</ExtLink>, <ExtLink href="https://polyandria.ru">«Поляндрия NoAge»</ExtLink>, <ExtLink href="https://www.mann-ivanov-ferber.ru">МИФ</ExtLink>, <ExtLink href="https://www.labirint.ru">«Лабиринт»</ExtLink>, серия <ExtLink href="https://www.labirint.ru/series/19658/">Orientalia et Classica</ExtLink>, книги издательства <ExtLink href="https://publisher-hyperion.ru">«Гиперион»</ExtLink>, <ExtLink href="https://www.livelib.ru">LiveLib</ExtLink>, <ExtLink href="https://www.hse.ru">сайт ВШЭ</ExtLink> и <ExtLink href="https://ru.wikipedia.org">Википедия</ExtLink>. Обложки показываются с сайтов-источников.</p>
      <p>В каталог входят: художественные книги японских авторов в русском переводе, художественные книги о Японии авторов из других стран и России, нехудожественные книги о Японии — история, культура, мифология, искусство, язык.</p>
    </>
  );
}
