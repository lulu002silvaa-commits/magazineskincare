$monitor=Cdp 'Page.addScriptToEvaluateOnNewDocument' @{source="window.__apiRequests=[];const staticFetch=window.fetch.bind(window);window.fetch=(url,options)=>{if(typeof url==='string' && url.includes('/api/'))window.__apiRequests.push(url);return staticFetch(url,options);};"}
Cdp 'Page.navigate' @{url=($base+'/index.html')} | Out-Null
WaitFor "document.querySelectorAll('#productGrid .product-card').length===135"
Check 'HTML carrega todos os produtos sem PHP' "document.querySelectorAll('#productGrid .product-card').length===135"
Check 'Não há aviso falso de atualização' "document.querySelector('.store-notice[role=alert]')===null"
Check 'Vitrine não solicita API ausente' 'window.__apiRequests.length===0'
Evaluate "document.querySelector('#searchInput').value='mandelico';document.querySelector('#searchForm').requestSubmit();true" | Out-Null
Check 'Busca funciona em hospedagem estática' "document.querySelectorAll('#productGrid .product-card').length>0 && document.querySelectorAll('#productGrid .product-card').length<135"
Cdp 'Page.navigate' @{url=($base+'/produto.html?id=creamy-calming-cream-1')} | Out-Null
WaitFor "document.querySelector('#productDetail') && !document.querySelector('#productDetail').hidden"
Check 'Galeria de fotos em HTML' "document.querySelectorAll('.product-gallery-thumbnail').length===4"
Evaluate "document.querySelector('#addProduct').click();true" | Out-Null
Check 'Adicionar à sacola sem PHP' "JSON.parse(localStorage.getItem('calma-pele-carrinho'))[0].quantity===1"
Cdp 'Page.navigate' @{url=($base+'/carrinho.html')} | Out-Null
WaitFor "document.querySelector('#cartItems .cart-item')"
Check 'Sacola salva navega entre páginas HTML' "document.querySelector('#cartCount').textContent==='1' && document.querySelector('#checkoutLink').getAttribute('href')==='checkout.html'"
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
Check 'Arquivos PHP não são publicados como texto' "(async()=>{const r=await fetch('/admin.php');return r.status===404;})()"
Check 'Modo estático sem exceções JavaScript' 'true'
if($script:errors.Count){throw ($script:errors -join ', ')}
Cdp 'Page.removeScriptToEvaluateOnNewDocument' @{identifier=$monitor.identifier} | Out-Null
Write-Output 'Verificação da vitrine HTML concluída.'
