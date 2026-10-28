import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let checks = 0;
function check(label, value) { assert.ok(value, label); checks++; console.log(`OK ${label}`); }
function build(env = {}) {
  return spawnSync(process.execPath, ['scripts/build-static.mjs'], { cwd: root, encoding: 'utf8', env: { ...process.env, STORE_API_ORIGIN: '', STORE_ADMIN_URL: '', STORE_STATIC_DIRECTORY: 'dist', ...env } });
}
const built = build({ STORE_STATIC_OFFLINE: '1' });
if (built.status !== 0) throw new Error(built.error?.message || built.stderr || 'Falha ao executar build.');
check('Build estático concluído', built.status === 0);
const dist = join(root, 'dist');
const context = { window: { location: { protocol: 'https:', hostname: 'magazineskincare.vercel.app', port: '' }, fetch() {} } };
vm.runInNewContext(await readFile(join(dist, 'js/deployment.js'), 'utf8'), context);
vm.runInNewContext(await readFile(join(dist, 'js/api-base.js'), 'utf8'), context);
check('Vitrine estática não depende de API inexistente', context.window.StoreConnection.mode === 'static' && context.window.StoreConnection.apiEnabled === false);
vm.runInNewContext(await readFile(join(dist, 'js/products.js'), 'utf8'), context);
check('Catálogo completo preservado', context.window.CREAMY_PRODUCTS.length === 119);
const withdrawn = JSON.parse(await readFile(join(root, 'withdrawn-products.json'), 'utf8')).ids;
check('Produtos retirados não estão no catálogo publicado', context.window.CREAMY_PRODUCTS.every(product => !withdrawn.includes(product.id)));
check('Catálogo publicado não contém o ingrediente apontado', !/ghk[\s-]*cu|copper\s+tripeptide|peptide\s*cream/i.test(JSON.stringify(context.window.CREAMY_PRODUCTS)));
const photos = new Set(context.window.CREAMY_PRODUCTS.flatMap(p => [p.imagem, ...p.imagens]));
check('377 fotos presentes', photos.size === 377);
for (const photo of photos) await access(join(dist, photo));
const forbidden = [];
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.name.startsWith('.') || /\.(?:php|env|ini|zip|pem|key|bat|ps1|mjs)$/i.test(entry.name)) forbidden.push(path);
    if (entry.isDirectory()) await inspect(path);
  }
}
await inspect(dist);
check('PHP, credenciais, dados e backups fora da publicação HTML', forbidden.length === 0);
for (const page of ['index.html', 'produto.html', 'carrinho.html', 'checkout.html', 'empresa.html', 'admin.html']) {
  const html = await readFile(join(dist, page), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="([^"?#]+)(?:\?[^"#]*)?"/g)) {
    const path = match[1]; if (/^(?:https?:|mailto:|tel:|data:|\/)/.test(path)) continue;
    await access(join(dist, path));
  }
  check(`Dependências de ${page} disponíveis`, true);
}
const connected = build({ STORE_STATIC_DIRECTORY: 'dist-test-connection', STORE_API_ORIGIN: 'https://backend.example.com' });
check('Build aceita backend PHP separado', connected.status === 0);
let requested;
const connectedContext = { window: { location: { protocol: 'https:', hostname: 'loja.example.com', port: '' }, fetch(url) { requested = url; } } };
vm.runInNewContext(await readFile(join(root, 'dist-test-connection/js/deployment.js'), 'utf8'), connectedContext);
vm.runInNewContext(await readFile(join(root, 'dist-test-connection/js/api-base.js'), 'utf8'), connectedContext);
connectedContext.window.fetch('/api/catalog');
check('Catálogo usa a origem PHP configurada', requested === 'https://backend.example.com/api/catalog');
check('Painel aponta para hospedagem PHP', connectedContext.window.StoreConnection.adminUrl === 'https://backend.example.com/admin.php');
const invalid = build({ STORE_STATIC_DIRECTORY: 'dist-test-invalid', STORE_API_ORIGIN: 'https://usuario:senha@example.com' });
check('Configuração não publica credenciais em URLs', invalid.status !== 0);
const production = build({ STORE_STATIC_DIRECTORY: 'dist-test-production' });
check('Produção conecta ao Render mesmo sem variáveis compartilhadas', production.status === 0);
const productionContext = { window: {} };
vm.runInNewContext(await readFile(join(root, 'dist-test-production/js/deployment.js'), 'utf8'), productionContext);
check('Endereço padrão de produção aponta para PHP publicado', productionContext.window.STORE_DEPLOYMENT.apiOrigin === 'https://magazineskincare.onrender.com');
check('Painel de produção usa mesma hospedagem do backend', productionContext.window.STORE_DEPLOYMENT.adminUrl === 'https://magazineskincare.onrender.com/admin.php');
console.log(`${checks} verificações do build HTML passaram.`);
