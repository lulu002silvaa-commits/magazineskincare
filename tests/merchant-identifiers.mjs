import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const context={window:{}};
vm.runInNewContext(await fs.readFile(new URL('js/products.js',root),'utf8'),context);
const evidence=JSON.parse(await fs.readFile(new URL('product-identifiers.json',root),'utf8')).products;
let brands=0,gtins=0;
for(const product of context.window.CREAMY_PRODUCTS) {
  const known=evidence[product.id];
  assert.ok(known && known.name===product.nome && known.source===product.fonte,product.id+': fonte e identidade comprovadas');
  assert.equal(product.marca,known.brand,product.id+': marca coerente com fabricante');
  brands++;
  if(product.gtin) {
    assert.equal(product.gtin,known.gtin,product.id+': código não corresponde à evidência');
    assert.match(product.gtin,/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/);
    assert.ok(!/^0+$/.test(product.gtin));
    const digits=[...product.gtin].map(Number);
    const control=digits.pop();let sum=0;
    for(let i=digits.length-1,weight=3;i>=0;i--,weight=4-weight)sum+=digits[i]*weight;
    assert.equal((10-sum%10)%10,control);
    gtins++;
  }
}
console.log(`${brands} marcas e ${gtins} GTINs conferidos contra evidências oficiais; nenhum MPN inventado.`);
