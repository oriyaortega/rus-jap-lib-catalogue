// Достаёт исходную (до React) версию сайта из истории git в .legacy/ — для сверки tools/compare-legacy.js.
// После этого `npm run dev` открывает её по адресу http://localhost:5173/legacy/
// Запуск: npm run legacy [-- <коммит>]  (по умолчанию — последний коммит старой версии)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const COMMIT = process.argv[2] || '591821e';
const out = path.resolve('.legacy');
fs.mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'app.js', 'styles.css']) {
  fs.writeFileSync(path.join(out, f), execFileSync('git', ['show', `${COMMIT}:${f}`]));
}
console.log(`Исходная версия (${COMMIT}) — в ${out}`);
