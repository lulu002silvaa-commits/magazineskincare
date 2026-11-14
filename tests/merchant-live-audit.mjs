import fs from 'node:fs/promises';
const origin = process.env.AUDIT_ORIGIN || 'https://magazineskincare.online';
const api = process.env.AUDIT_API || 'https://magazineskincare.onrender.com/api/catalog';
const issues = [], warnings = [], results = [];
const get = async (url, options={}) => {
  const response = await fetch(url, {...options,signal:AbortSignal.timeout(30000)});
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response;
};
const catalog = (await (await get(api)).json()).products;
const feed = await (await get(origin + '/merchant-feed.xml')).text();
const decode = text => text.replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&apos;',"'");
const read = (xml, tag) => decode(xml.match(new RegExp(`<g:${tag}>([\\s\\S]*?)<\\/g:${tag}>`))?.[1] || '');
const entries = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match=>match[1]);
const byId = new Map(entries.map(item=>[read(item,'id'),item]));
if (entries.length !== catalog.length) issues.push({id:'feed',problem:'Quantidade do feed diferente do catálogo'});
let done=0, cursor=0;
async function worker() {
  while(cursor<catalog.length) {
    const product=catalog[cursor++], id=product.id;
    try {
      const item=byId.get(id); if(!item) throw new Error('Produto ausente no feed');
      const amount=Number(product.precoPix ?? product.preco).toFixed(2);
      const available=product.disponivel && (product.estoque==null || product.estoque>0);
      const expected=available?'in_stock':'out_of_stock';
      if(read(item,'price')!==amount+' BRL') issues.push({id,problem:'Preço do feed divergente'});
      if(read(item,'availability')!==expected) issues.push({id,problem:'Estoque do feed divergente'});
      if(!read(item,'brand')) issues.push({id,problem:'Marca ausente no feed'});
      if(read(item,'condition')!=='new') issues.push({id,problem:'Condição incorreta no feed'});
      if(!read(item,'description').trim()) issues.push({id,problem:'Descrição ausente no feed'});
      const shipping=item.match(/<g:shipping>([\s\S]*?)<\/g:shipping>/)?.[1]||'';
      if(read(shipping,'country')!=='BR' || read(shipping,'price')!=='0.00 BRL') issues.push({id,problem:'Frete ausente ou divergente do site'});
      if(!read(item,'gtin')) warnings.push({id,problem:'GTIN não informado; verificar se atribuído pelo fabricante'});
      const html=await(await get(read(item,'link').replace('https://magazineskincare.online',origin))).text();
      const match=html.match(/<script[^>]*id="productStructuredData"[^>]*>([\s\S]*?)<\/script>/);
      if(!match) throw new Error('Dados estruturados ausentes no HTML');
      const schema=JSON.parse(match[1]);
      if(Number(schema.offers.price).toFixed(2)!==amount || schema.offers.priceCurrency!=='BRL') issues.push({id,problem:'Preço do HTML divergente'});
      if(!schema.offers.availability.endsWith(available?'InStock':'OutOfStock')) issues.push({id,problem:'Estoque do HTML divergente'});
      if(schema.name!==product.nome || schema.sku!==id) issues.push({id,problem:'Identidade do HTML divergente'});
      if(schema.brand?.name!==product.marca || !schema.brand?.name) issues.push({id,problem:'Marca incompleta ou divergente no HTML'});
      if(schema.offers.itemCondition!=='https://schema.org/NewCondition') issues.push({id,problem:'Condição ausente no HTML'});
      if(product.gtin && schema.gtin!==product.gtin && schema['gtin'+product.gtin.length]!==product.gtin) issues.push({id,problem:'GTIN divergente ou ausente no HTML'});
      if(!html.includes('id="serverProductSummary"')) issues.push({id,problem:'Resumo visível depende do JavaScript'});
      if(!html.includes(`data-merchant-price="${amount}"`)) issues.push({id,problem:'Preço visível no HTML divergente'});
      if(schema.offers.shippingDetails?.shippingRate?.value!=='0.00') issues.push({id,problem:'Frete divergente nos dados estruturados'});
      if(schema.offers.hasMerchantReturnPolicy?.merchantReturnDays!==7) issues.push({id,problem:'Política de devolução divergente nos dados estruturados'});
      await get(read(item,'image_link'),{method:'HEAD'});
      results.push({id,price:amount,image:'ok',page:'ok'});
    } catch(error) {issues.push({id,problem:error.message});}
    done++;if(done%20===0)console.log(`${done}/${catalog.length} páginas e imagens conferidas`);
  }
}
await Promise.all(Array.from({length:4},worker));
const summary={products:catalog.length,feedItems:entries.length,verified:results.length,issues:issues.length,missingGtin:warnings.length};
await fs.mkdir('.runtime',{recursive:true});
await fs.writeFile('.runtime/google-shopping-live-audit.json',JSON.stringify({summary,issues,warnings,results},null,2));
console.log(JSON.stringify(summary));
if(issues.length) {console.log(JSON.stringify(issues.slice(0,8)));process.exitCode=1;}
