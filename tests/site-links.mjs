import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const files = (await fs.readdir(root)).filter(file => file.endsWith('.html') && file !== 'admin.html');
const context = { window: {} };
vm.runInNewContext(await fs.readFile(path.join(root, 'js/products.js'), 'utf8'), context);
const ids = new Set(context.window.CREAMY_PRODUCTS.map(product => product.id));
let links = 0;
for (const file of files) {
  const html = await fs.readFile(path.join(root, file), 'utf8');
  assert.equal((html.match(/<h1\b/g) || []).length, 1, file + ': um único H1');
  for (const match of html.matchAll(/(?:href|src)="([^"<>]+)"/g)) {
    const value = match[1];
    if (/^(?:https?:|mailto:|tel:|data:)/.test(value)) continue;
    const url = new URL(value, 'https://audit.local/' + file);
    const target = url.pathname.slice(1) || 'index.html';
    await fs.access(path.join(root, target));
    if (url.hash && target.endsWith('.html')) {
      const destination = await fs.readFile(path.join(root, target), 'utf8');
      assert.ok(destination.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), file + ': âncora inexistente ' + value);
    }
    if (target === 'produto.html' && url.searchParams.has('id')) assert.ok(ids.has(url.searchParams.get('id')), 'Produto inexistente: ' + value);
    links++;
  }
}
console.log(`${files.length} páginas: H1, ${links} links, âncoras e arquivos locais verificados.`);
