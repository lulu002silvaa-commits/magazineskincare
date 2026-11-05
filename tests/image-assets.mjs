import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import vm from 'node:vm';
const context = { window: {} };
for (const file of ['js/products.js', 'js/catalog.js', 'js/image-assets.js']) {
  vm.runInNewContext(await readFile(new URL('../' + file, import.meta.url), 'utf8'), context);
}
const assets = context.window.STORE_IMAGE_ASSETS;
let originalBytes = 0, optimizedBytes = 0;
for (const [original, asset] of Object.entries(assets)) {
  const originalSize = (await stat(new URL('../' + original, import.meta.url))).size;
  const optimizedSize = (await stat(new URL('../' + asset.src, import.meta.url))).size;
  assert.ok(optimizedSize <= originalSize, original + ': versão otimizada não pode ser maior');
  for (const path of new Set([asset.src, asset.thumb])) {
    const buffer = await readFile(new URL('../' + path, import.meta.url));
    if (path.endsWith('.webp')) assert.equal(buffer.toString('ascii', 8, 12), 'WEBP', path);
  }
  originalBytes += originalSize;
  optimizedBytes += optimizedSize;
}
for (const product of context.window.CREAMY_PRODUCTS) {
  for (const path of [product.imagem, ...product.imagens]) assert.ok(assets[path], path);
}
for (const slide of context.window.STORE_CONFIG.images.heroSlides) {
  for (const path of [slide.src, slide.mobileSrc]) await stat(new URL('../' + path, import.meta.url));
}
assert.ok(optimizedBytes < originalBytes * 0.4, 'Redução total deve superar 60%');
console.log(`${Object.keys(assets).length} imagens verificadas; redução total de ${(100 * (1 - optimizedBytes / originalBytes)).toFixed(1)}%.`);
