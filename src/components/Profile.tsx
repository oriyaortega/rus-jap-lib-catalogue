// Профиль автора или переводчика: карточка, имя, сведения, биография, ссылки
import { Fragment, useEffect, useState } from 'react';
import { Yomifuda } from './cards';
import { ExtLink, Join } from './common';
import { profileFacts, profileHeading } from '../lib/people';
import { wikiSummary } from '../lib/wikidata';
import type { PersonInfo } from '../types';

// Биография: своё поле bio важнее; иначе — вступление статьи Википедии (подгружается после отрисовки).
// Короткие описания Викиданных не показываем: их может править кто угодно, встречается вандализм.
function Bio({ person }: { person: PersonInfo }) {
  const title = person.bio ? null : person.w?.ruwiki ?? null;
  const [extract, setExtract] = useState<{ title: string; text: string } | null>(null);
  useEffect(() => {
    if (!title) return;
    let alive = true;
    wikiSummary(title).then((s) => { if (alive && s?.extract) setExtract({ title, text: s.extract }); });
    return () => { alive = false; };
  }, [title]);

  if (person.bio) {
    return (
      <div className="bio" id="bio">
        <p>{person.bio}</p>
        {person.bio_src && <p className="src">Источник: <ExtLink href={person.bio_src.url}>{person.bio_src.name}</ExtLink></p>}
      </div>
    );
  }
  return (
    <div className="bio" id="bio">
      {extract && extract.title === title && <>
        <p>{extract.text}</p>
        <p className="src">Источник: <ExtLink href={`https://ru.wikipedia.org/wiki/${encodeURIComponent(title)}`}>Википедия</ExtLink>, CC BY-SA 4.0</p>
      </>}
    </div>
  );
}

function ExtLinks({ person: p }: { person: PersonInfo }) {
  const w = p.w;
  const items = [
    p.wikidata && <ExtLink href={`https://www.wikidata.org/wiki/${p.wikidata}`}>{`Викиданные (${p.wikidata})`}</ExtLink>,
    w?.ruwiki && <ExtLink href={`https://ru.wikipedia.org/wiki/${encodeURIComponent(w.ruwiki)}`}>Википедия</ExtLink>,
    w?.jawiki && <ExtLink href={`https://ja.wikipedia.org/wiki/${encodeURIComponent(w.jawiki)}`} lang="ja">ウィキペディア</ExtLink>,
    ...(p.links || []).map((l) => <ExtLink href={l.url}>{l.name}</ExtLink>),
  ].filter(Boolean);
  if (!items.length) return null;
  return <p className="small"><Join items={items} sep=" · " /></p>;
}

export function Profile({ person: p, role }: { person: PersonInfo; role: string }) {
  const facts = profileFacts(p);
  return (
    <div className="profile">
      <Yomifuda person={p} />
      <div>
        <h1>{profileHeading(p)}</h1>
        {p.kanji ? <p className="orig" lang="ja">{p.kanji}</p> : p.orig && p.orig !== p.name_ru ? <p className="orig">{p.orig}</p> : null}
        <p className="role">{role}</p>
        <div className="facts">
          {facts.map((f, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              <b>{`${f.key}:`}</b>
              {'kanji' in f
                ? <>{' '}<span lang="ja">{f.kanji}</span>{f.kana && <>{' '}<span lang="ja">{`（${f.kana}）`}</span></>}</>
                : ` ${f.text}`}
            </Fragment>
          ))}
        </div>
        <Bio person={p} />
        <ExtLinks person={p} />
      </div>
    </div>
  );
}
