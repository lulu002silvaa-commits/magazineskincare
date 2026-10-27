import { cp, mkdir, readFile, writeFile, readdir, lstat, rm } from 'node:fs/promises';
import { resolve, dirname, join, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, process.env.STORE_STATIC_DIRECTORY || 'dist');
if (output === root || !output.startsWith(root + sep) || !/^dist(?:-[a-zA-Z0-9_-]+)?$/.test(relative(root, output))) {
  throw new Error('A saída estática deve ser uma pasta dist dentro do projeto.');
}
async function exists(path) { try { await lstat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }
// Limpa somente a saída gerada, já limitada acima a dist/dist-* dentro do projeto.
if (await exists(output)) {
  await rm(output, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
}
await mkdir(output, { recursive: true });

function publicUrl(value, label, originOnly = false) {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (originOnly && url.pathname !== '/')) {
    throw new Error(`${label} deve ser uma URL HTTPS pública, sem credenciais nem parâmetros.`);
  }
  return originOnly ? url.origin : url.href;
}
const apiOrigin = publicUrl(process.env.STORE_API_ORIGIN, 'STORE_API_ORIGIN', true);
const adminUrl = publicUrl(process.env.STORE_ADMIN_URL, 'STORE_ADMIN_URL') || (apiOrigin ? `${apiOrigin}/admin.php` : '');
const pages = ['index.html', 'produto.html', 'carrinho.html', 'checkout.html', 'empresa.html', 'admin.html'];
for (const page of pages) await cp(join(root, page), join(output, page));
for (const folder of ['css', 'js', 'public']) await cp(join(root, folder), join(output, folder), { recursive: true, dereference: false });
await writeFile(join(output, 'js', 'deployment.js'), `// Configuração pública gerada para a vitrine HTML.\nwindow.STORE_DEPLOYMENT = ${JSON.stringify({ mode: 'static', apiOrigin, adminUrl })};\n`);

const sandbox = { window: {} };
vm.runInNewContext(await readFile(join(root, 'js', 'products.js'), 'utf8'), sandbox, { timeout: 2000 });
const products = sandbox.window.CREAMY_PRODUCTS;
if (!Array.isArray(products) || !products.length) throw new Error('Catálogo estático vazio.');
const photos = new Set(products.flatMap(product => [product.imagem, ...(product.imagens || [])]));
for (const path of photos) {
  if (typeof path !== 'string' || !path.startsWith('public/images/') || path.includes('..') || !await exists(join(output, path))) throw new Error(`Foto inválida ou ausente: ${path}`);
}
const extensions = new Set(['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.ttf', '.otf', '.txt']);
async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink() || entry.name.startsWith('.')) throw new Error(`Arquivo não permitido na vitrine: ${relative(output, path)}`);
    if (entry.isDirectory()) await check(path);
    else if (!extensions.has(extname(path).toLowerCase())) throw new Error(`A vitrine não pode publicar código de servidor: ${relative(output, path)}`);
  }
}
await check(output);
console.log(`Vitrine HTML pronta: ${products.length} produtos, ${photos.size} fotos. Backend ${apiOrigin ? 'conectado à origem configurada' : 'não configurado; compras desativadas'}.`);
