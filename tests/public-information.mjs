import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const context = { window: {} };
for (const file of ['js/products.js', 'js/product-information.js', 'js/catalog.js']) vm.runInNewContext(await readFile(new URL(file, root), 'utf8'), context);
const config = context.window.STORE_CONFIG;
assert.equal(config.brand.announcements.length, 3);
assert.ok(config.brand.announcements.every(message => !/PRIMEIRA5|R\$299|5% OFF/.test(message)));
assert.ok(config.brand.announcements.some(message => message.includes('acima de R$349')));
for (const slide of config.images.heroSlides) {
  assert.ok(slide.src.includes('/magazine-') && !/Creamy|Jade|OFF/i.test(slide.alt));
  for (const path of [slide.src, slide.mobileSrc]) await readFile(new URL(path, root));
}
const product = { id: 'test', nome: 'Cosmético', preco: 50, estoque: 3, descricao: 'Resultados comprovados em apenas 7 dias. Aqui na Creamy.', especificacoes: { 'Principais benefícios': 'Elimina a acne em 7 dias.', 'Composição': 'Aqua, Glycerin.', 'Como usar': 'Aplicar conforme o rótulo.' } };
const reviewed = context.window.StoreProductInformation(product);
assert.ok(!/comprovad|7 dias|aqui na Creamy/i.test(reviewed.descricao));
assert.ok(!/Elimina/.test(reviewed.especificacoes['Principais benefícios']));
assert.equal(reviewed.especificacoes.Composição, product.especificacoes.Composição);
assert.equal(reviewed.especificacoes['Como usar'], product.especificacoes['Como usar']);
assert.equal(reviewed.preco, product.preco);
assert.equal(reviewed.estoque, product.estoque);
assert.ok(product.descricao.includes('comprovados'), 'Revisão pública não sobrescreve o cadastro');
const company = await readFile(new URL('empresa.html', root), 'utf8');
assert.ok(company.includes('Taboola (Realize)') && company.includes('Não há cupom adicional ativo'));
assert.ok(company.includes('exatamente R$ 349') && company.includes('não se aplica'));
for (const page of ['index.html', 'produto.html', 'carrinho.html', 'checkout.html']) {
  const html = await readFile(new URL(page, root), 'utf8');
  assert.ok(!/PRIMEIRA5|black-friday-[1-5]|Jade Picon/.test(html));
  assert.ok(html.indexOf('js/product-information.js') < html.indexOf('js/loja.js'));
}
console.log('Ofertas, banners próprios, privacidade e preservação de preço, estoque e instruções verificados.');
