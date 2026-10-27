$monitor=Cdp 'Page.addScriptToEvaluateOnNewDocument' @{source="window.__apiRequests=[];const staticFetch=window.fetch.bind(window);window.fetch=(url,options)=>{if(typeof url==='string' && url.includes('/api/'))window.__apiRequests.push(url);return staticFetch(url,options);};"}
Cdp 'Page.navigate' @{url=($base+'/index.html')} | Out-Null
WaitFor "document.querySelectorAll('#productGrid .product-card').length===135"
Check 'HTML carrega todos os produtos sem PHP' "document.querySelectorAll('#productGrid .product-card').length===135"
Check 'Não há aviso falso de atualização' "document.querySelector('.store-notice[role=alert]')===null"
Check 'Vitrine não solicita API ausente' 'window.__apiRequests.length===0'
Check 'Carrossel tem os cinco banners originais' "document.querySelectorAll('.hero-slider-dot').length===5"
Cdp 'Emulation.setDeviceMetricsOverride' @{width=390;height=844;deviceScaleFactor=1;mobile=$true} | Out-Null
WaitFor "document.querySelector('.hero-slide-image').currentSrc.includes('home-1-mobile.png') && document.querySelector('.hero-slide-image').naturalWidth>0"
Check 'Banner mobile tem proporção vertical' "document.querySelector('.hero-media').getBoundingClientRect().height>document.querySelector('.hero-media').getBoundingClientRect().width*1.2"
Screenshot 'banner-home-mobile.png'
Evaluate "document.querySelector('[data-hero-next]').click();true" | Out-Null
WaitFor "document.querySelector('.hero-slide-image').currentSrc.includes('home-2-mobile.png')"
Check 'Setas trocam versão mobile e indicador' "document.querySelectorAll('.hero-slider-dot')[1].getAttribute('aria-current')==='true'"
Evaluate "document.querySelector('.hero-slider-pause').click();true" | Out-Null
Check 'Carrossel pode ser pausado' "document.querySelector('.hero-slider-pause').getAttribute('aria-pressed')==='true'"
Cdp 'Emulation.setDeviceMetricsOverride' @{width=1440;height=1000;deviceScaleFactor=1;mobile=$false} | Out-Null
WaitFor "document.querySelector('.hero-slide-image').currentSrc.includes('home-2-desktop.png')"
Check 'Desktop usa banner horizontal original' "document.querySelector('.hero-media').getBoundingClientRect().width>document.querySelector('.hero-media').getBoundingClientRect().height*2.7"
Screenshot 'banner-home-desktop.png'
Evaluate "document.querySelector('#produtos').scrollIntoView({block:'start',behavior:'instant'});true" | Out-Null
WaitFor "[...document.querySelectorAll('#featuredGrid img')].every(image=>image.complete && image.naturalWidth>0)"
Check 'Vitrine tem cards no novo modelo' "document.querySelectorAll('#featuredGrid .product-card .product-pricing').length===4 && document.querySelectorAll('#featuredGrid .cart-icon-button').length===4"
Screenshot 'vitrine-referencia.png'
Evaluate "document.querySelector('#searchInput').value='mandelico';document.querySelector('#searchForm').requestSubmit();true" | Out-Null
Check 'Busca funciona em hospedagem estática' "document.querySelectorAll('#productGrid .product-card').length>0 && document.querySelectorAll('#productGrid .product-card').length<135"
Cdp 'Page.navigate' @{url=($base+'/produto.html?id=creamy-calming-cream-1')} | Out-Null
WaitFor "document.querySelector('#productDetail') && !document.querySelector('#productDetail').hidden"
Check 'Galeria de fotos em HTML' "document.querySelectorAll('.product-gallery-thumbnail').length===4"
Check 'Produto com benefícios, compra e opções relacionadas' "!!document.querySelector('.product-buy-box') && document.querySelectorAll('#productBenefits li').length>0 && document.querySelectorAll('#relatedProducts .product-card').length===4"
Check 'Pontos da galeria acompanham as fotos' "document.querySelectorAll('.product-gallery-dot').length===4"
Check 'Dados estruturados correspondem ao produto visível' "(()=>{const data=JSON.parse(document.querySelector('#productStructuredData').textContent);return data.name===document.querySelector('#productName').textContent && data.offers.priceCurrency==='BRL' && data.image.length===4 && data.offers.availability==='https://schema.org/InStock';})()"
Check 'Descrição aparece antes das recomendações' "document.querySelector('#productInformation details').open && document.querySelector('#productDetail').nextElementSibling.id==='productInformation'"
Evaluate "document.querySelector('#productZoom').click();true" | Out-Null
WaitFor "document.querySelector('#productZoomImage').naturalWidth>0"
Check 'Foto ampliada usa imagem selecionada' "document.querySelector('#productPhotoDialog').open && document.querySelector('#productZoomImage').src===document.querySelector('#productMainImage').src"
Evaluate "document.querySelector('#productPhotoDialog').close();true" | Out-Null
Evaluate "window.unitPriceText=document.querySelector('#productPrices strong').textContent;document.querySelector('#quantityPlus').click();true" | Out-Null
Check 'Preço do produto aumenta com a quantidade' "Number(document.querySelector('#productQuantity').value)===2 && document.querySelector('#productPrices strong').textContent.replace(/[^0-9]/g,'')===String(Number(window.unitPriceText.replace(/[^0-9]/g,''))*2)"
Evaluate "document.querySelector('#productQuantity').value='3';document.querySelector('#productQuantity').dispatchEvent(new Event('input'));true" | Out-Null
Check 'Quantidade digitada recalcula o total' "document.querySelector('#productPrices strong').textContent.replace(/[^0-9]/g,'')===String(Number(window.unitPriceText.replace(/[^0-9]/g,''))*3)"
Evaluate "document.querySelector('#quantityMinus').click();document.querySelector('#quantityMinus').click();true" | Out-Null
Check 'Diminuir quantidade restaura o preço unitário' "document.querySelector('#productPrices strong').textContent===window.unitPriceText"
Screenshot 'produto-referencia.png'
Cdp 'Emulation.setDeviceMetricsOverride' @{width=390;height=844;deviceScaleFactor=1;mobile=$true} | Out-Null
Check 'Página do produto cabe no celular' 'document.documentElement.scrollWidth<=window.innerWidth'
Check 'Apresentação mobile aparece antes da foto' "document.querySelector('.product-intro').getBoundingClientRect().bottom<=document.querySelector('#productGallery').getBoundingClientRect().top && document.querySelector('#benefitsBlock').getBoundingClientRect().top>=document.querySelector('#productGallery').getBoundingClientRect().bottom"
Check 'Foto do produto aproveita largura mobile' "document.querySelector('#productMainImageContainer').getBoundingClientRect().width>=window.innerWidth-30"
Evaluate "document.querySelector('#productZoom').click();true" | Out-Null
Check 'Ampliação mobile ocupa a tela' "document.querySelector('#productPhotoDialog').getBoundingClientRect().width>=window.innerWidth-2 && document.querySelector('#photoViewport').getBoundingClientRect().width>=window.innerWidth-24"
Evaluate "document.querySelector('#photoZoomToggle').click();true" | Out-Null
Check 'Zoom duplica a largura da foto sem distorcer' "document.querySelector('#photoZoomToggle').getAttribute('aria-pressed')==='true' && document.querySelector('#productZoomImage').getBoundingClientRect().width>=document.querySelector('#photoViewport').clientWidth*1.95"
Evaluate "document.querySelector('#photoNext').click();true" | Out-Null
Check 'Próxima foto mantém galeria e ampliação sincronizadas' "document.querySelector('#photoPosition').textContent.startsWith('2 /') && document.querySelector('#productZoomImage').src===document.querySelector('#productMainImage').src && document.querySelector('#photoZoomToggle').getAttribute('aria-pressed')==='false'"
Screenshot 'produto-zoom-mobile.png'
Evaluate "document.querySelector('#productPhotoDialog').close();true" | Out-Null
Screenshot 'produto-referencia-mobile.png'
Cdp 'Emulation.setDeviceMetricsOverride' @{width=1600;height=1000;deviceScaleFactor=1;mobile=$false} | Out-Null
Evaluate "document.querySelector('#addProduct').click();true" | Out-Null
WaitFor "location.pathname.endsWith('/carrinho.html') && document.querySelector('#cartItems .cart-item')"
Check 'Adicionar à sacola sem PHP' "JSON.parse(localStorage.getItem('calma-pele-carrinho'))[0].quantity===1"
Cdp 'Page.navigate' @{url=($base+'/carrinho.html')} | Out-Null
WaitFor "document.querySelector('#cartItems .cart-item')"
Check 'Sacola salva navega entre páginas HTML' "document.querySelector('#cartCount').textContent==='1' && document.querySelector('#checkoutLink').getAttribute('href')==='checkout.html'"
Check 'Sacola tem entrega, cupom e resumo' "!!document.querySelector('#cartCoupon') && !!document.querySelector('#cartPostcode') && !!document.querySelector('#cartDiscountTotal')"
Check 'Sacola mostra recomendações complementares' "document.querySelectorAll('#cartRecommendations .product-card').length===4 && document.querySelectorAll('#cartReminders .product-card').length===4"
Evaluate "window.originalAddressFetch=window.fetch;window.fetch=(url,options)=>/viacep.com.br|brasilapi.com.br|opencep.com/.test(String(url))?Promise.resolve({ok:true,json:()=>Promise.resolve(String(url).includes('00000000')?{erro:true}:{logradouro:'Rua de Teste',bairro:'Centro',localidade:'Belo Horizonte',uf:'MG',street:'Rua de Teste',neighborhood:'Centro',city:'Belo Horizonte',state:'MG'})}):window.originalAddressFetch(url,options);document.querySelector('#cartPostcode').value='30140-071';document.querySelector('[data-shipping-form]').requestSubmit();document.querySelector('#couponCode').value='TESTE-INVALIDO';document.querySelector('#cartCoupon').requestSubmit();true" | Out-Null
WaitFor "document.querySelector('#cartShippingStatus').textContent.includes('Rua de Teste')"
Check 'CEP mostra prazo de entrega informado pela loja' "document.querySelector('#cartShippingStatus').textContent.includes('Frete grátis') && document.querySelector('#cartShippingStatus').textContent.includes('3 dias')"
Check 'CEP preenche endereço e pede número' "document.querySelector('#cartPostcode-street').value==='Rua de Teste' && document.querySelector('#cartPostcode-street').hidden && !document.querySelector('#cartPostcode-number').hidden && document.querySelector('#cartShippingStatus').textContent.includes('Belo Horizonte')"
Evaluate "document.querySelector('#cartPostcode-number').value='123';document.querySelector('#cartPostcode-number').dispatchEvent(new Event('input'));true" | Out-Null
Check 'Número é preservado para o checkout' "JSON.parse(sessionStorage.getItem('magazine-delivery-address')).number==='123'"
Evaluate "window.fetch=(url,options)=>String(url).includes('viacep.com.br')?Promise.resolve({ok:true,json:()=>Promise.resolve({erro:true})}):String(url).includes('brasilapi.com.br')?Promise.resolve({ok:true,json:()=>Promise.resolve({cep:'65905296',street:'Rua Alternativa',neighborhood:'Bairro Alternativo',city:'Imperatriz',state:'MA'})}):String(url).includes('opencep.com')?Promise.reject(new Error('Serviço indisponível')):window.originalAddressFetch(url,options);document.querySelector('#cartPostcode').value='65905-296';document.querySelector('#cartPostcode').dispatchEvent(new Event('input'));document.querySelector('[data-shipping-form]').requestSubmit();true" | Out-Null
WaitFor "document.querySelector('#cartShippingStatus').textContent.includes('Rua Alternativa')"
Check 'Base alternativa encontra quando primeira falha' "document.querySelector('#cartPostcode-city').value==='Imperatriz' && document.querySelector('#cartPostcode-state').value==='MA'"
Evaluate "window.fetch=(url,options)=>/viacep.com.br|brasilapi.com.br|opencep.com/.test(String(url))?Promise.resolve({ok:true,json:()=>Promise.resolve({erro:true})}):window.originalAddressFetch(url,options);true" | Out-Null
Evaluate "document.querySelector('#cartPostcode').value='00000-000';document.querySelector('#cartPostcode').dispatchEvent(new Event('input'));document.querySelector('[data-shipping-form]').requestSubmit();true" | Out-Null
WaitFor "document.querySelector('#cartShippingStatus').textContent.includes('bases consultadas')"
Check 'Trocar CEP remove endereço anterior' "!document.querySelector('.delivery-address-fields').hidden && !document.querySelector('#cartPostcode-street').hidden && document.querySelector('#cartPostcode-street').value==='' && JSON.parse(sessionStorage.getItem('magazine-delivery-address')).zipCode==='00000000'"
Evaluate "document.querySelector('#cartPostcode-street').value='Rua Informada';document.querySelector('#cartPostcode-street').dispatchEvent(new Event('input'));true" | Out-Null
Check 'Endereço manual pode ser preenchido na sacola' "JSON.parse(sessionStorage.getItem('magazine-delivery-address')).street==='Rua Informada'"
Check 'Cupom inválido não cria desconto' "document.querySelector('#couponStatus').textContent.includes('Nenhum desconto') && document.querySelector('#cartDiscountTotal').textContent.includes('0,00')"
Evaluate "document.querySelector('#cartRecommendations .cart-icon-button').click();true" | Out-Null
Check 'Recomendação atualiza sacola e resumo' "document.querySelectorAll('#cartItems .cart-item').length===2 && document.querySelector('#cartCount').textContent==='2'"
Evaluate "document.querySelectorAll('#cartItems .remove-item')[1].click();true" | Out-Null
Evaluate "document.querySelector('#toast').classList.remove('visible');true" | Out-Null
Screenshot 'sacola-referencia.png'
Cdp 'Emulation.setDeviceMetricsOverride' @{width=390;height=844;deviceScaleFactor=1;mobile=$true} | Out-Null
Check 'Sacola no novo modelo cabe no celular' 'document.documentElement.scrollWidth<=window.innerWidth'
Screenshot 'sacola-referencia-mobile.png'
Cdp 'Page.navigate' @{url=($base+'/checkout.html')} | Out-Null
WaitFor "document.querySelector('.checkout-unavailable')"
Check 'Sem backend não coleta dados nem simula cobrança' "document.querySelector('#checkoutForm').hidden && document.querySelector('#reserveOrder').disabled && document.querySelector('#pixPayment').hidden"
Check 'Checkout estático não solicita API de pagamentos' 'window.__apiRequests.length===0'
Check 'Resumo dos produtos continua visível' "document.querySelector('#checkoutItems').textContent.includes('Calming Cream')"
Cdp 'Emulation.setDeviceMetricsOverride' @{width=390;height=844;deviceScaleFactor=1;mobile=$true} | Out-Null
Check 'Resumo estático cabe no celular' 'document.documentElement.scrollWidth<=window.innerWidth'
Screenshot 'vitrine-html-checkout.png'
Cdp 'Page.navigate' @{url=($base+'/admin.html')} | Out-Null
WaitFor "document.querySelector('#adminHelp') && !document.querySelector('#adminHelp').hidden"
Check 'Painel PHP preservado sem redirecionar para 404' "location.pathname==='/admin.html' && document.querySelector('#loginForm')===null"
Check 'Arquivos PHP não são publicados como texto' "(async()=>{const r=await fetch('/admin.php');return [403,404].includes(r.status);})()"
foreach($page in @('index.html','produto.html?id=creamy-calming-cream-1','carrinho.html','checkout.html')) {
  Cdp 'Page.navigate' @{url=($base+'/'+$page)} | Out-Null
  WaitFor "document.readyState==='complete' && document.querySelector('#cartCount')"
  foreach($width in @(320,360,390,768,1024,1440,1920)) {
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=$width;height=1000;deviceScaleFactor=1;mobile=($width -lt 700)} | Out-Null
    Check ($page+' cabe em '+$width+'px') 'document.documentElement.scrollWidth<=window.innerWidth'
  }
}
Cdp 'Page.navigate' @{url=($base+'/index.html')} | Out-Null
WaitFor "document.querySelectorAll('#productGrid .product-card').length===135"
Cdp 'Emulation.setDeviceMetricsOverride' @{width=390;height=844;deviceScaleFactor=1;mobile=$true} | Out-Null
Evaluate "document.querySelector('.menu-toggle').click();true" | Out-Null
Check 'Menu mobile abre com estado acessível' "document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='true' && document.querySelector('#mainNav').classList.contains('nav-open')"
Evaluate "document.querySelector('#mainNav a').click();true" | Out-Null
Check 'Menu mobile fecha ao escolher seção' "document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='false'"
Evaluate "document.querySelector('#mobileSearchToggle').click();true" | Out-Null
Check 'Busca mobile abre e recebe foco' "document.querySelector('#searchForm').classList.contains('search-open') && document.activeElement.id==='searchInput'"
Evaluate "document.querySelector('#mobileSearchToggle').click();true" | Out-Null
Screenshot 'otimizacao-home-mobile.png'
Cdp 'Page.navigate' @{url=($base+'/empresa.html')} | Out-Null
WaitFor "document.querySelector('#devolucoes')"
Check 'Atendimento usa contatos fornecidos pela loja' "document.querySelector('#atendimento a').href==='https://wa.me/5511919756184'"
Check 'Entrega e devolução têm prazos distintos' "document.querySelector('#entrega').textContent.includes('3 dias') && document.querySelector('#devolucoes').textContent.includes('7 dias corridos')"
Check 'Informações da loja cabem no celular' 'document.documentElement.scrollWidth<=window.innerWidth'
Evaluate "localStorage.setItem('calma-pele-carrinho',JSON.stringify([{id:'creamy-calming-cream-1',quantity:7}]));true" | Out-Null
Cdp 'Page.navigate' @{url=($base+'/carrinho.html')} | Out-Null
WaitFor "document.querySelector('#cartGift')"
Check 'Brinde aparece sem aumentar total da sacola' "document.querySelector('#cartGift').textContent.includes('Brinde') && document.querySelector('#cartSubtotal').textContent.replace(/[^0-9]/g,'')==='38493'"
Evaluate "localStorage.setItem('calma-pele-carrinho',JSON.stringify([{id:'creamy-calming-cream-1',quantity:6}]));true" | Out-Null
Cdp 'Page.navigate' @{url=($base+'/carrinho.html')} | Out-Null
WaitFor "document.querySelector('#cartItems .cart-item')"
Check 'Brinde sai quando total fica abaixo da promoção' "!document.querySelector('#cartGift')"
Check 'Modo estático sem exceções JavaScript' 'true'
if($script:errors.Count){throw ($script:errors -join ', ')}
Cdp 'Page.removeScriptToEvaluateOnNewDocument' @{identifier=$monitor.identifier} | Out-Null
Write-Output 'Verificação da vitrine HTML concluída.'
