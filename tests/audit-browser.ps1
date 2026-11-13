Cdp 'Page.navigate' @{url=($base+'/index.html')} | Out-Null
WaitFor "document.querySelectorAll('#productGrid .product-card').length===119"
Evaluate "[...document.querySelectorAll('#catalogCategoryTabs button')].find(b=>b.textContent==='Haircare').click();document.querySelector('#searchInput').value='mandelico';document.querySelector('#searchForm').requestSubmit();true" | Out-Null
Check 'Busca remove categoria anterior em vez de gerar vazio indevido' "document.querySelectorAll('#productGrid .product-card').length>0 && document.querySelector('#activeFilters').textContent.includes('mandelico') && !document.querySelector('#activeFilters').textContent.includes('Haircare')"
Evaluate "document.querySelector('#searchInput').value='produto-que-nao-existe-xyz';document.querySelector('#searchForm').requestSubmit();true" | Out-Null
Check 'Busca vazia oferece recuperação e não esvazia a seleção da loja' "!document.querySelector('#catalogEmpty').hidden && document.querySelectorAll('#featuredGrid .product-card').length===4 && !document.querySelector('#clearCatalogFilters').hidden"
Evaluate "document.querySelector('#clearEmptyFilters').click();true" | Out-Null
Check 'Limpar filtros recupera todos os produtos reais' "document.querySelectorAll('#productGrid .product-card').length===119 && document.querySelector('#catalogEmpty').hidden && document.querySelector('#searchInput').value===''"
Evaluate "window.originalBannerPrice=window.STORE_CONFIG.products.find(p=>p.id==='ceramide-skin-repair').preco;window.STORE_CONFIG.products.find(p=>p.id==='ceramide-skin-repair').preco=2;document.querySelectorAll('.hero-slider-dot')[0].click();document.querySelector('[data-hero-next]').click();true" | Out-Null
Check 'Banner com preço divergente é omitido' "document.querySelector('.hero-media').dataset.activeSlide==='2' && document.querySelectorAll('.hero-slider-dot')[1].style.display==='none'"
Evaluate "window.STORE_CONFIG.products.find(p=>p.id==='ceramide-skin-repair').preco=window.originalBannerPrice;true" | Out-Null
foreach($page in 'sobre.html','contato.html','privacidade.html','cookies.html','termos.html','entrega.html','trocas.html','reembolso.html') {
  Cdp 'Page.navigate' @{url=($base+'/'+$page)} | Out-Null
  WaitFor "document.readyState==='complete' && document.querySelector('h1')"
  Check ('Metadados e links institucionais de '+$page) "document.querySelectorAll('h1').length===1 && document.querySelector('link[rel=canonical]').href==='https://magazineskincare.online/$page' && document.querySelectorAll('.institutional-links a').length===9 && !!document.querySelector('meta[name=description]')"
  foreach($width in 320,390,1440) {
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=$width;height=950;deviceScaleFactor=1;mobile=($width -lt 700)} | Out-Null
    Check ($page+' cabe em '+$width+'px') 'document.documentElement.scrollWidth<=innerWidth'
  }
}
Check 'Auditoria sem exceções JavaScript' 'true'
if($script:errors.Count){throw ($script:errors -join ', ')}
Write-Output 'Busca, recuperação do catálogo e oito páginas institucionais verificadas como visitante.'
