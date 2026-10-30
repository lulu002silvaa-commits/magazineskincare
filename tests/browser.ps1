param([switch]$Static, [switch]$Connected, [string]$StaticBase = "http://127.0.0.1:8093")
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$base = if ($Static -or $Connected) { $StaticBase } elseif ($env:TEST_BASE_URL) { $env:TEST_BASE_URL } else { 'http://127.0.0.1:8091' }
$output = Join-Path $root '.runtime/browser-check'
New-Item -ItemType Directory -Path $output -Force | Out-Null
$browser = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
$profile = Join-Path $output ('profile-' + [guid]::NewGuid().ToString('N'))
$process = Start-Process -FilePath $browser -ArgumentList @('--headless','--no-sandbox','--disable-gpu','--no-first-run','--remote-debugging-port=9223','--remote-allow-origins=*',('--user-data-dir="'+$profile+'"'),'about:blank') -WindowStyle Hidden -PassThru
$socket = New-Object Net.WebSockets.ClientWebSocket
$script:sequence = 0
$script:errors = @()
function Cdp($method,$parameters=@{}) {
  $script:sequence++
  $message = @{id=$script:sequence;method=$method;params=$parameters} | ConvertTo-Json -Depth 30 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($message)
  $segment = New-Object 'ArraySegment[byte]' -ArgumentList (,$bytes)
  $socket.SendAsync($segment,[Net.WebSockets.WebSocketMessageType]::Text,$true,[Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
  while($true) {
    $stream = New-Object IO.MemoryStream
    do {
      $buffer = New-Object byte[] 65536
      $chunk = New-Object 'ArraySegment[byte]' -ArgumentList (,$buffer)
      $result = $socket.ReceiveAsync($chunk,[Threading.CancellationToken]::None).GetAwaiter().GetResult()
      $stream.Write($buffer,0,$result.Count)
    } while(!$result.EndOfMessage)
    $reply = [Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json
    $stream.Dispose()
    if($reply.method -eq 'Runtime.exceptionThrown') {$script:errors += $reply.params.exceptionDetails.text}
    if($reply.id -eq $script:sequence) {if($reply.error){throw ($reply.error | ConvertTo-Json)}; return $reply.result}
  }
}
function Evaluate($expression) {
  $result = Cdp 'Runtime.evaluate' @{expression=$expression;awaitPromise=$true;returnByValue=$true}
  if($result.exceptionDetails){throw ($result.exceptionDetails | ConvertTo-Json -Depth 10)}
  return $result.result.value
}
function WaitFor($expression) {
  for($attempt=0;$attempt -lt 100;$attempt++) {
    try { if(Evaluate ('Boolean('+ $expression +')')){return} }
    catch { if($_.Exception.Message -notmatch 'execution context|Cannot find context|Promise was collected|Inspected target navigated'){throw} }
    Start-Sleep -Milliseconds 100
  }
  throw ('Tempo esgotado: '+$expression)
}
function Check($name,$expression) {if(!(Evaluate $expression)){throw ('FALHOU: '+$name)}; Write-Output ('OK '+$name)}
function Screenshot($name) {$capture=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false};[IO.File]::WriteAllBytes((Join-Path $output $name),[Convert]::FromBase64String($capture.data))}
try {
  $target=$null
  for($i=0;$i -lt 60;$i++){try{$allTargets=Invoke-RestMethod -Uri 'http://127.0.0.1:9223/json/list'; $target=$allTargets | Where-Object type -eq 'page' | Select-Object -First 1;if($target){break}}catch{};Start-Sleep -Milliseconds 100}
  if(!$target){throw 'Chrome não iniciou'}
  $socket.ConnectAsync([uri]$target.webSocketDebuggerUrl,[Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
  Cdp 'Page.enable' | Out-Null
  Cdp 'Runtime.enable' | Out-Null
  Cdp 'Storage.clearDataForOrigin' @{origin=$base;storageTypes='all'} | Out-Null
  Cdp 'Emulation.setDeviceMetricsOverride' @{width=1600;height=1000;deviceScaleFactor=1;mobile=$false} | Out-Null
  if($Static){$base=$StaticBase;. (Join-Path $PSScriptRoot 'browser-static.ps1');return}
  if($Connected){. (Join-Path $PSScriptRoot 'browser-connected.ps1');return}
  Cdp 'Page.navigate' @{url=($base+'/admin.php')} | Out-Null
  WaitFor "document.querySelector('#loginForm')"
  Evaluate "document.querySelector('[name=username]').value='admin';document.querySelector('[name=password]').value='php-admin-test-only-2026';document.querySelector('#loginForm').requestSubmit();true" | Out-Null
  WaitFor "document.querySelector('#stats .stat')"
  Check 'Quatro indicadores no dashboard' "document.querySelectorAll('.stat').length===4"
  Check 'Imagem do painel cobre toda a tela' "document.body.classList.contains('admin-wallpaper') && getComputedStyle(document.body,'::before').backgroundSize.includes('cover')"
  Check 'Imagem de fundo do painel carrega' "(async()=>{const image=new Image();return await new Promise(resolve=>{image.onload=()=>resolve(image.naturalWidth>0);image.onerror=()=>resolve(false);image.src='/public/images/admin/background.png';});})()"
  Evaluate "window.panelFetch=window.fetch;window.panelRows=document.querySelectorAll('tbody tr').length;window.fetch=async(url,options)=>String(url).includes(encodeURIComponent('/admin/data'))?new Response(JSON.stringify({error:'Falha temporária de teste'}),{status:503,headers:{'Content-Type':'application/json'}}):window.panelFetch(url,options);document.querySelector('#refresh').click();true" | Out-Null
  WaitFor "document.querySelector('#notice').textContent==='Falha temporária de teste'"
  Check 'Falha temporária não apaga dados exibidos no painel' "document.querySelectorAll('tbody tr').length===window.panelRows && document.querySelectorAll('.stat').length===4"
  Evaluate "window.fetch=window.panelFetch;true" | Out-Null
  Check 'Menu lateral e tabelas' "!!document.querySelector('.sidebar') && document.querySelectorAll('table').length===2"
  Check 'Painel exibe limpeza de gerados e status aprovado' "!!document.querySelector('#clearGenerated') && document.querySelector('#content').textContent.includes('Aprovado')"
  Check 'Exclusão individual aparece na tabela de Pix' "document.querySelectorAll('[data-delete-payment]').length>0"
  Evaluate "window.testTones=0;window.AudioContext=class{constructor(){this.state='running';this.currentTime=0;this.destination={};}async resume(){}createOscillator(){return{frequency:{value:0},connect(){},disconnect(){},start(){window.testTones++;},stop(){}};}createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}};document.querySelector('#pixSound').click();true" | Out-Null
  WaitFor "document.querySelector('#pixSound').getAttribute('aria-pressed')==='true'"
  Check 'Som pode ser ativado com prévia' 'window.testTones===2'
  Evaluate "window.soundOriginalFetch=window.fetch;window.fetch=async(url,options)=>{const response=await window.soundOriginalFetch(url,options);if(String(url).includes(encodeURIComponent('/admin/data'))){const data=await response.json();data.charges.push({id:'sound-fixture-only',createdAt:Math.floor(Date.now()/1000)+1,status:'PENDING',amount:100,items:[]});return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});}return response;};document.querySelector('#refresh').click();true" | Out-Null
  WaitFor 'window.testTones===4'
  Evaluate "document.querySelector('#refresh').click();true" | Out-Null
  WaitFor "document.querySelector('#notice').textContent==='Painel atualizado.'"
  Check 'Mesmo Pix não dispara alerta repetido' 'window.testTones===4'
  Evaluate "document.querySelector('#pixSound').click();window.fetch=window.soundOriginalFetch;document.querySelector('#refresh').click();true" | Out-Null
  WaitFor "document.querySelectorAll('[data-order]').length===1"
  Check 'Som pode ser desativado' "document.querySelector('#pixSound').getAttribute('aria-pressed')==='false'"
  Screenshot 'dashboard.png'
  Evaluate "document.querySelector('[data-page=products]').click();true" | Out-Null
  Check 'Listagem paginada de produtos' "document.querySelectorAll('[data-edit]').length===12"
  Evaluate "document.querySelector('#productSearch').value='mandelico';document.querySelector('#productSearch').dispatchEvent(new Event('input'));true" | Out-Null
  Check 'Busca de produtos sem acentos' "document.querySelectorAll('[data-edit]').length>0 && document.querySelectorAll('[data-edit]').length<12"
  Evaluate "document.querySelector('#productSearch').value='';document.querySelector('#productSearch').dispatchEvent(new Event('input'));document.querySelector('[data-edit]').click();true" | Out-Null
  Check 'Editor com todas as fotos' "document.querySelector('dialog').open && document.querySelectorAll('.image-row').length>=4"
  WaitFor "document.fonts.check('13px AdminRoc') && [...document.querySelectorAll('.product-thumb')].every(img=>img.complete && img.naturalWidth>0)"
  Check 'Imagens e fontes carregam' "document.fonts.check('13px AdminRoc') && [...document.querySelectorAll('.product-thumb')].every(img=>img.complete && img.naturalWidth>0)"
  Screenshot 'editor.png'
  Evaluate "document.querySelector('[name=preco]').value='52.34';document.querySelectorAll('[data-move]')[2].click();document.querySelector('#productForm').requestSubmit();true" | Out-Null
  WaitFor "!document.querySelector('dialog').open && document.querySelector('#notice').textContent.includes('Produto salvo')"
  Check 'Preço e reordenação persistem' "(async()=>{const r=await fetch('/api/catalog');const d=await r.json();return d.products[0].preco===52.34 && d.products[0].imagem===d.products[0].imagens[0];})()"
  Screenshot 'produtos.png'
  Evaluate "document.querySelector('[data-page=dashboard]').click();true" | Out-Null
  Cdp 'Emulation.setDeviceMetricsOverride' @{width=390;height=844;deviceScaleFactor=1;mobile=$true} | Out-Null
  Check 'Dashboard cabe no celular' 'document.documentElement.scrollWidth<=window.innerWidth'
  Screenshot 'mobile.png'
  Cdp 'Page.navigate' @{url=($base+'/produto.html?id=creamy-calming-cream-1')} | Out-Null
  WaitFor "document.querySelector('#productName')?.textContent.length>0"
  Check 'Loja usa preço salvo no admin' "document.querySelector('#productPrices').textContent.includes('52,34')"
  Check 'Galeria pública preservada' "document.querySelectorAll('.product-gallery-thumbnail').length>=4"
  Evaluate "document.querySelector('#addProduct').click();true" | Out-Null
  WaitFor "location.pathname.endsWith('/carrinho.html') && document.querySelector('#cartItems .cart-item')"
  Cdp 'Page.navigate' @{url=($base+'/carrinho.html')} | Out-Null
  WaitFor "document.querySelector('#cartItems .cart-item')"
  Check 'Título da sacola preservado' "document.title.startsWith('Sua sacola')"
  Check 'Sacola cabe no celular' 'document.documentElement.scrollWidth<=window.innerWidth'
  Evaluate "const c=JSON.parse(localStorage.getItem('calma-pele-carrinho'));c.push({id:'produto-removido',quantity:1});localStorage.setItem('calma-pele-carrinho',JSON.stringify(c));location.reload();true" | Out-Null
  WaitFor "document.querySelectorAll('.cart-item').length===2"
  Check 'Produto removido pode sair da sacola' "[...document.querySelectorAll('.cart-item')].find(row=>row.textContent.includes('não está mais')).querySelector('button')!==null"
  Evaluate "[...document.querySelectorAll('.cart-item')].find(row=>row.textContent.includes('não está mais')).querySelector('button').click();true" | Out-Null
  Check 'Sacola liberada após remover item inválido' "document.querySelectorAll('.cart-item').length===1 && document.querySelector('#checkoutLink').getAttribute('aria-disabled')==='false'"
  Evaluate "(async()=>{const s=await(await fetch('/api.php?route=/admin/session')).json();const c=await(await fetch('/api/catalog')).json();const p=c.products[0];p.estoque=1;await fetch('/api.php?route=/admin/product',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':s.csrf},body:JSON.stringify({product:p,revision:c.revision})});return true;})()" | Out-Null
  Cdp 'Page.navigate' @{url=($base+'/produto.html?id=creamy-calming-cream-1')} | Out-Null
  WaitFor "document.querySelector('#productQuantity')?.max==='1'"
  Evaluate "document.querySelector('#addProduct').click();true" | Out-Null
  Check 'Estoque limita quantidade na sacola' "JSON.parse(localStorage.getItem('calma-pele-carrinho'))[0].quantity===1"
  Evaluate "const saved=JSON.parse(localStorage.getItem('calma-pele-carrinho'));saved[0].quantity=3;localStorage.setItem('calma-pele-carrinho',JSON.stringify(saved));true" | Out-Null
  Cdp 'Page.navigate' @{url=($base+'/carrinho.html')} | Out-Null
  WaitFor "document.querySelector('.cart-quantity')"
  Evaluate "document.querySelector('.cart-quantity button').click();true" | Out-Null
  Check 'Quantidade antiga pode diminuir mesmo após redução de estoque' "JSON.parse(localStorage.getItem('calma-pele-carrinho'))[0].quantity===2"
  Evaluate "document.querySelector('.cart-quantity button').click();true" | Out-Null
  Check 'Sacola volta a permitir avanço na quantidade disponível' "document.querySelector('#checkoutLink').getAttribute('aria-disabled')==='false'"
  Cdp 'Page.navigate' @{url=($base+'/checkout.html')} | Out-Null
  WaitFor "document.querySelector('#reserveOrder') && !document.querySelector('#reserveOrder').disabled"
  Check 'Checkout com QR local' "typeof window.qrcode==='function' && [...document.scripts].every(script=>!script.src.startsWith('https://'))"
  Evaluate "window.cepOriginalFetch=window.fetch;window.fetch=(url,options)=>/viacep.com.br|brasilapi.com.br|opencep.com/.test(String(url))?Promise.resolve({ok:true,json:()=>Promise.resolve({logradouro:'Rua Consulta',bairro:'Centro',localidade:'São Paulo',uf:'SP',street:'Rua Consulta',neighborhood:'Centro',city:'São Paulo',state:'SP'})}):window.cepOriginalFetch(url,options);document.querySelector('#shippingZipCode').value='01001-000';document.querySelector('#shippingZipCode').dispatchEvent(new Event('input'));true" | Out-Null
  WaitFor "document.querySelector('#shippingAddress').value==='Rua Consulta'"
  Check 'Consulta de CEP preenche checkout' "document.querySelector('#shippingNeighborhood').value==='Centro' && document.querySelector('#shippingCity').value==='São Paulo' && document.querySelector('#shippingState').value==='SP'"
  Evaluate "document.querySelector('#shippingNumber').value='456';document.querySelector('#shippingNumber').dispatchEvent(new Event('input'));window.fetch=window.cepOriginalFetch;true" | Out-Null
  Cdp 'Page.navigate' @{url=($base+'/checkout.html')} | Out-Null
  WaitFor "document.querySelector('#shippingNumber') && document.querySelector('#shippingNumber').value==='456'"
  Check 'Checkout reaproveita endereço e número' "document.querySelector('#shippingAddress').value==='Rua Consulta' && document.querySelector('#shippingZipCode').value==='01001-000'"
  Check 'Checkout cabe no celular' 'document.documentElement.scrollWidth<=window.innerWidth'
  Evaluate "document.querySelector('#customerPhone').value='+55 (11) 91234-5678';document.querySelector('#customerPhone').dispatchEvent(new Event('input'));true" | Out-Null
  Check 'WhatsApp colado com código do Brasil recebe máscara' "document.querySelector('#customerPhone').value==='(11) 91234-5678' && document.querySelector('#customerPhone').checkValidity()"
  Evaluate "document.querySelector('#customerPhone').value='55912345678';document.querySelector('#customerPhone').dispatchEvent(new Event('input'));true" | Out-Null
  Check 'DDD 55 não é confundido com código do país' "document.querySelector('#customerPhone').value==='(55) 91234-5678'"
  Evaluate "document.querySelector('#customerPhone').value='1132345678';document.querySelector('#customerPhone').dispatchEvent(new Event('input'));true" | Out-Null
  Check 'Telefone fixo recebe máscara de oito dígitos' "document.querySelector('#customerPhone').value==='(11) 3234-5678' && document.querySelector('#customerPhone').checkValidity()"
  Evaluate "document.querySelector('#customerPhone').value='119123';document.querySelector('#customerPhone').dispatchEvent(new Event('input'));document.querySelector('#customerPhone').dispatchEvent(new Event('blur'));true" | Out-Null
  Check 'Número incompleto mostra orientação acessível' "!document.querySelector('#customerPhone').checkValidity() && document.querySelector('#customerPhone').getAttribute('aria-invalid')==='true' && document.querySelector('#customerPhoneHelp').textContent.includes('número completo')"
  Evaluate "document.querySelector('#customerPhone').value='11999999999';document.querySelector('#customerPhone').dispatchEvent(new Event('input'));true" | Out-Null
  Evaluate "const fields={customerName:'Teste Navegador',customerPhone:'11999999999',customerEmail:'navegador@example.com',customerCpf:'52998224725',shippingZipCode:'70000000',shippingAddress:'Rua Teste',shippingNumber:'123',shippingNeighborhood:'Centro',shippingCity:'Brasilia',shippingState:'DF'};for(const [id,value] of Object.entries(fields))document.getElementById(id).value=value;document.querySelector('#checkoutContinue').click();true" | Out-Null
  Check 'Etapa de entrega exibe endereço e frete' "!document.querySelector('.address-fieldset').hidden && document.querySelector('#checkoutStepLabel').textContent==='Etapa 2 de 3'"
  Screenshot 'checkout-entrega-mobile.png'
  Evaluate "document.querySelector('#checkoutContinue').click();true" | Out-Null
  Check 'Somente Pix disponível nas formas de pagamento' "document.querySelectorAll('#checkoutPaymentStage .payment-methods button:disabled').length===3 && !document.querySelector('#checkoutPaymentStage .payment-methods .selected').disabled && !document.querySelector('#checkoutPaymentStage').hidden"
  Check 'Pagamento revisa endereço e total' "document.querySelector('#checkoutAddressReview').textContent.includes('Rua Teste') && document.querySelector('#reserveOrderTop').textContent.includes(document.querySelector('#checkoutSubtotal').textContent)"
  Screenshot 'checkout-pagamento-mobile.png'
  Cdp 'Emulation.setDeviceMetricsOverride' @{width=1440;height=1000;deviceScaleFactor=1;mobile=$false} | Out-Null
  Screenshot 'checkout-pagamento-desktop.png'
  Evaluate "document.querySelector('#reserveOrderTop').click();true" | Out-Null
  WaitFor "document.querySelector('#pixPayment') && !document.querySelector('#pixPayment').hidden"
  WaitFor "document.querySelector('#pixQrImage').naturalWidth>0"
  Check 'Pix com QR e copia e cola' "document.querySelector('#pixCopyPaste').value.startsWith('000201') && document.querySelector('#pixQrImage').naturalWidth>0"
  WaitFor "(async()=>{const data=await(await fetch('/api/admin/data')).json();const id=sessionStorage.getItem('mineironet_creamystore_session');return data.visits.some(row=>row.sessionId===id && row.stage==='pix_pending');})()"
  Check 'Painel acompanha produto entrega revisão e Pix do mesmo visitante' "(async()=>{const data=await(await fetch('/api/admin/data')).json();const id=sessionStorage.getItem('mineironet_creamystore_session'),visits=data.visits.filter(row=>row.sessionId===id),current=visits.find(row=>row.online);return visits.length===1 && current.stages.product && current.productName && current.stage==='pix_pending' && current.stages.checkout_delivery && current.stages.checkout_review && visits.filter(row=>row.online).length===1;})()"
  Evaluate "document.querySelector('#pixInvoice').click();true" | Out-Null
  WaitFor "!document.querySelector('#pixInvoice').disabled"
  Check 'Confirmar pagamento consulta sem aprovar Pix pendente' "document.querySelector('#pixInvoice').tagName==='BUTTON' && document.querySelector('#pixInvoice').textContent==='Confirmar pagamento' && document.querySelector('#pixStatus').textContent.includes('ainda não') && localStorage.getItem('calma-pele-carrinho')!==null"
  Check 'Blocos da finalização ocupam largura uniforme' "getComputedStyle(document.querySelector('#pixPayment')).display==='block' && Math.abs(document.querySelector('.pix-method-review').getBoundingClientRect().width-document.querySelector('#pixPayment').getBoundingClientRect().width)<2"
  Check 'Checkout Pix mostra prazo de dez minutos' "document.querySelector('#pixExpiry').textContent.includes('neste checkout') && !document.querySelector('#pixExpiryProgress').hidden && /^09:|^10:00$/.test(document.querySelector('#pixCountdown').textContent)"
  Check 'Resumo Pix mostra entrega e valor real' "document.querySelector('#pixDeliveryReview').textContent.includes('Rua Teste') && document.querySelector('#pixOrderTotal').textContent===document.querySelector('#checkoutSubtotal').textContent"
  Evaluate "document.querySelector('#pixViewCode').click();true" | Out-Null
  Check 'Código completo pode ser expandido' "document.querySelector('#pixCopyPaste').rows===6 && document.querySelector('#pixViewCode').getAttribute('aria-expanded')==='true'"
  Evaluate "Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.testCopiedPix=text;}}});document.querySelector('#copyPix').click();true" | Out-Null
  WaitFor "window.testCopiedPix===document.querySelector('#pixCopyPaste').value"
  Check 'Botão copia código Pix correto' "window.testCopiedPix.startsWith('000201')"
  Check 'Cópia informa sucesso e resumo mantém total' "document.querySelector('#pixCopyStatus').textContent.includes('copiado') && document.querySelector('#pixSummaryTotal').textContent===document.querySelector('#pixOrderTotal').textContent"
  Screenshot 'checkout-mobile.png'
  Check 'QR do gateway funciona mesmo com imagem quebrada' "(async()=>{const original=window.fetch,payload=document.querySelector('#pixCopyPaste').value,expiry='2030-01-01T12:00:00Z';try{for(const broken of ['imagem-invalida','https://example.invalid/qr.png','data:image/png;base64,quebrado','']){window.fetch=async url=>new Response(JSON.stringify(String(url).includes('payment-config')?{method:'gateway',available:true}:{success:true,data:{transactionId:'TEST-QR-ONLY',amount:5234,paymentMethod:'blackcat',paymentData:{copyPaste:payload,qrCodeBase64:broken,expiresAt:expiry}}}),{status:200,headers:{'Content-Type':'application/json'}});const result=await window.PaymentService.createCharge({test:'qr-only',expectedAmount:5234});if(result.data.paymentData.copyPaste!==payload || result.data.paymentData.expiresAt!==expiry)return false;const loaded=await new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image.naturalWidth>0);image.onerror=()=>resolve(false);image.src=result.data.paymentData.qrCodeBase64;});if(!loaded)return false;}return true;}finally{window.fetch=original;}})()"
  Check 'Expiração aceita timestamps e fusos e ignora datas ambíguas' "(()=>{const s=window.PaymentService,t=Date.parse('2030-01-01T12:00:00Z');return s.expirationTime(t)===t && s.expirationTime(t/1000)===t && s.expirationTime(String(t/1000))===t && s.expirationTime('2030-01-01T09:00:00-03:00')===t && Number.isNaN(s.expirationTime('2030-01-01T12:00:00')) && Number.isNaN(s.expirationTime(null));})()"
  Evaluate "const service=window.PaymentService;window.PaymentService={...service,createCharge:async data=>{const result=await service.createCharge(data);result.data.paymentData.checkoutExpiresAt=new Date(service.now()+4000).toISOString();return result;}};document.querySelector('#checkoutForm').requestSubmit();true" | Out-Null
  WaitFor "document.querySelector('#pixCountdown').textContent.length>0"
  Check 'Expiração retornada gera contagem e barra' "!document.querySelector('#pixExpiryProgress').hidden && document.querySelector('#pixCountdown').textContent!=='00:00'"
  Screenshot 'pix-contagem-desktop.png'
  Cdp 'Emulation.setDeviceMetricsOverride' @{width=390;height=844;deviceScaleFactor=1;mobile=$true} | Out-Null
  Check 'Tela Pix cabe no celular' 'document.documentElement.scrollWidth<=window.innerWidth'
  Screenshot 'pix-contagem-mobile.png'
  WaitFor "document.querySelector('#pixCountdown').textContent==='00:00'"
  Check 'Expiração desativa código e QR' "document.querySelector('#copyPix').disabled && document.querySelector('#pixQrImage').hidden && document.querySelector('#pixCopyPaste').hidden && document.querySelector('#pixStatus').textContent.includes('prazo')"
  Check 'Pix vencido permite revisar o pedido' "!document.querySelector('#pixRetry').hidden"
  Evaluate "window.PaymentService={...window.PaymentService,getPaymentStatus:async()=>{throw new Error('Falha simulada');}};document.querySelector('#pixInvoice').click();true" | Out-Null
  WaitFor "!document.querySelector('#pixInvoice').disabled"
  Check 'Falha na consulta não marca pedido como pago' "document.querySelector('#pixStatus').textContent.includes('Não foi possível') && localStorage.getItem('calma-pele-carrinho')!==null"
  Evaluate "window.confirm=()=>true;document.querySelector('#pixRetry').click();true" | Out-Null
  WaitFor "!document.querySelector('#pixInvoice').disabled"
  Check 'Falha na consulta impede segunda cobrança' "!document.querySelector('#pixPayment').hidden && document.querySelector('#checkoutLayout').hidden"
  Evaluate "window.PaymentService={...window.PaymentService,getPaymentStatus:async id=>({success:true,data:{transactionId:id,status:'PAID'}})};document.querySelector('#pixInvoice').click();true" | Out-Null
  WaitFor "document.querySelector('#pixTitle').textContent==='Pagamento aprovado'"
  Check 'Resposta paga confirma e encerra cobrança na tela' "document.querySelector('#pixInvoice').disabled && document.querySelector('#pixInvoice').textContent==='Pagamento confirmado' && localStorage.getItem('calma-pele-carrinho')===null"

  Cdp 'Page.navigate' @{url=($base+'/admin.php')} | Out-Null
  WaitFor "document.querySelector('[data-order]')"
  Evaluate "document.querySelector('[data-order]').click();true" | Out-Null
  Check 'Admin consulta cliente e entrega do pedido' "document.querySelector('.order-body').textContent.includes('Teste Navegador') && document.querySelector('.order-body').textContent.includes('Rua Teste')"
  Cdp 'Page.navigate' @{url=($base+'/index.html')} | Out-Null
  WaitFor "document.querySelectorAll('#productGrid .product-card').length===119"
  foreach($width in 320,390,768,1440) {
    Cdp 'Emulation.setDeviceMetricsOverride' @{width=$width;height=1000;deviceScaleFactor=1;mobile=($width -lt 700)} | Out-Null
    Check ('Página inicial cabe em '+$width+'px') 'document.documentElement.scrollWidth<=window.innerWidth'
  }
  Screenshot 'loja-desktop.png'
  $offline=Cdp 'Page.addScriptToEvaluateOnNewDocument' @{source="const originalFetch=window.fetch.bind(window);window.fetch=(url,options)=>typeof url==='string' && url.includes('/api/catalog')?new Promise(resolve=>setTimeout(()=>resolve(new Response('{}',{status:503,headers:{'Content-Type':'application/json'}})),5000)):originalFetch(url,options);"}
  Cdp 'Page.navigate' @{url=($base+'/index.html')} | Out-Null
  WaitFor "document.querySelectorAll('.hero-slider-dot').length===5 && document.querySelector('.hero-slide-image').naturalWidth>0"
  Check 'Banner inicia sem esperar resposta do catálogo' "!document.querySelector('.store-notice') && document.querySelector('.hero-slide-image').complete"
  WaitFor "document.querySelector('.store-notice')"
  Check 'Falha no catálogo não permite comprar com preço antigo' "document.querySelector('.store-notice button')!==null && document.querySelectorAll('#productGrid button:not(:disabled)').length===0"
  Cdp 'Page.removeScriptToEvaluateOnNewDocument' @{identifier=$offline.identifier} | Out-Null
  Check 'Sem exceções JavaScript' 'true'
  if($script:errors.Count){throw ($script:errors -join ', ')}
  Write-Output 'Verificação de navegador concluída.'
} finally {
  $socket.Dispose()
  if(!$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue}
  $outputPrefix=[IO.Path]::GetFullPath($output).TrimEnd('\')+'\'
  $profileFull=[IO.Path]::GetFullPath($profile)
  if($profileFull.StartsWith($outputPrefix,[StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $profileFull)) {Remove-Item -LiteralPath $profileFull -Recurse -Force -ErrorAction SilentlyContinue}
}
