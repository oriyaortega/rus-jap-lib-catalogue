/// <reference types="vitest/config" />
import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
// Данные и картинки лежат в корне репозитория (data/, images/). В режиме разработки Vite отдаёт их сам,
// при сборке они копируются в dist/ рядом с index.html.
const SHARED = ['data', 'images'];
// Исходная версия сайта для сверки (tools/compare-legacy.js): если её положить в .legacy/, она открывается по /legacy/
const LEGACY_DIR = path.join(root, '.legacy');

const MIME: Record<string, string> = {
  '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
};

// /legacy/… → .legacy/… (index.html, app.js, styles.css), а данные и картинки — общие из корня
const serveLegacy: Connect.NextHandleFunction = (req, res, next) => {
  const url = decodeURIComponent((req.url || '').split('?')[0]);
  if (!url.startsWith('/legacy/') || !fs.existsSync(LEGACY_DIR)) return next();
  const rel = url.slice('/legacy/'.length) || 'index.html';
  const base = SHARED.some((d) => rel.startsWith(`${d}/`)) ? root : LEGACY_DIR;
  const file = path.resolve(base, rel);
  if (!file.startsWith(base) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return next();
  res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(file).pipe(res);
};

function catalogAssets(): Plugin {
  return {
    name: 'catalog-assets',
    configureServer(server) {
      server.middlewares.use(serveLegacy);
    },
    // Сборка: data/ и images/ — в dist/, чтобы папку можно было выложить целиком
    closeBundle() {
      const out = path.join(root, 'dist');
      if (!fs.existsSync(out)) return;
      for (const dir of SHARED) fs.cpSync(path.join(root, dir), path.join(out, dir), { recursive: true });
    },
  };
}

export default defineConfig({
  base: './',            // относительные пути: сайт работает и в подпапке (GitHub Pages: /rus-jap-lib-catalogue/)
  publicDir: false,      // статические файлы — data/ и images/, их копирует catalogAssets()
  plugins: [react(), catalogAssets()],
  server: { port: 5173, strictPort: true, watch: { ignored: ['**/images/**', '**/docs/**', '**/.legacy/**'] } },
  preview: { port: 4173, strictPort: true },
  // Тесты логики (src/**/*.test.ts); React-компоненты не тестируются
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
