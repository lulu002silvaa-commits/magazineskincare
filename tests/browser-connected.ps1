Cdp 'Page.navigate' @{url=($base+'/produto.html?id=creamy-calming-cream-1')} | Out-Null
WaitFor "document.querySelector('#productDetail') && !document.querySelector('#productDetail').hidden && !document.querySelector('#addProduct').disabled"
Check 'Loja conecta ao backend PHP' "window.StoreConnection.apiEnabled && window.StoreConnection.apiOrigin==='https://magazineskincare.onrender.com'"
Evaluate "document.querySelector('#addProduct').click();true" | Out-Null
WaitFor "location.pathname.endsWith('/carrinho.html') && document.querySelector('#checkoutLink')?.getAttribute('aria-disabled')==='false'"
Evaluate "document.querySelector('#checkoutLink').click();true" | Out-Null
WaitFor "location.pathname.endsWith('/checkout.html') && document.querySelector('#reserveOrder') && !document.querySelector('#reserveOrder').disabled"
Check 'Checkout aparece sem bloqueio estatico' "!document.querySelector('#checkoutForm').hidden && !document.querySelector('.checkout-unavailable')"
Check 'BlackCat disponivel para gerar Pix' "document.querySelector('#paymentProviderTitle').textContent.includes('BlackCat') && document.querySelector('#paymentAvailability').textContent.includes('dispon')"
Check 'Identificacao aparece na primeira etapa' "document.querySelector('#checkoutStepLabel').textContent==='Etapa 1 de 3'"
foreach($width in @(320,390,768,1440)) {
  Cdp 'Emulation.setDeviceMetricsOverride' @{width=$width;height=1000;deviceScaleFactor=1;mobile=($width -lt 700)} | Out-Null
  Check ('Checkout conectado cabe em '+$width+'px') 'document.documentElement.scrollWidth<=window.innerWidth'
}
Screenshot 'checkout-producao-conectado.png'
if($script:errors.Count){throw ($script:errors -join ', ')}
Write-Output 'Conexao validada sem criar cobranca ou enviar dados pessoais.'
