$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$testPath = Join-Path $root ('.runtime/test-review-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testPath | Out-Null
$names = @('STORE_DATA_DIR','STORE_LOAD_ENV','STORE_TEST_CATALOG_ACTIVE','ADMIN_SYNC_PASSWORD','BLACKCAT_API_KEY')
$previous = @{}
foreach($name in $names){$previous[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
$server = $null
function Check($label, $value){if(!$value){throw "FAILED: $label"}; Write-Output "OK $label"}
try {
 $env:STORE_DATA_DIR=$testPath
 $env:STORE_LOAD_ENV='0'
 $env:STORE_TEST_CATALOG_ACTIVE='0'
 $env:ADMIN_SYNC_PASSWORD='catalog-review-test-only-2026'
 $env:BLACKCAT_API_KEY=''
 $server=Start-Process -FilePath (Join-Path $root '.runtime/php/php.exe') -ArgumentList @('-c','php-local.ini','-S','127.0.0.1:8094','router.php') -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $testPath 'server.log')
 $base='http://127.0.0.1:8094'
 $ready=$false
 for($i=0;$i -lt 40;$i++){try{if((Invoke-RestMethod "$base/api/health").ok){$ready=$true;break}}catch{};Start-Sleep -Milliseconds 100}
 if(!$ready -or $server.HasExited){throw 'Review test server failed to start'}
 $catalog=Invoke-RestMethod "$base/api/catalog"
 Check 'Public API hides all legacy offers during review' ($catalog.catalogReview -and $catalog.products.Count -eq 0)
 $store=Invoke-RestMethod "$base/api/store"
 Check 'Alternative public store API also hides legacy offers' ($store.produtos.Count -eq 0)
 $products=Invoke-WebRequest "$base/js/products.js" -UseBasicParsing
 Check 'Public JavaScript contains an empty catalog' ($products.Content.Trim() -eq 'window.CREAMY_PRODUCTS = [];')
 $feed=[xml](Invoke-WebRequest "$base/api/merchant-feed" -UseBasicParsing).Content
 Check 'Merchant feed contains no legacy offers' ($feed.SelectNodes('//item').Count -eq 0)
 $sitemap=(Invoke-WebRequest "$base/api/sitemap" -UseBasicParsing).Content
 Check 'Sitemap does not promote legacy product pages' (!$sitemap.Contains('produto.html'))
 $config=Invoke-RestMethod "$base/api/payment-config"
 Check 'New checkout is unavailable during review' (!$config.available)
 $code=0
 try{Invoke-WebRequest "$base/api/payments/blackcat" -Method Post -ContentType 'application/json' -Body '{}' -UseBasicParsing | Out-Null}catch{$code=[int]$_.Exception.Response.StatusCode}
 Check 'Direct payment requests cannot bypass the review' ($code -eq 503)
 $code=0
 try{Invoke-WebRequest "$base/produto.html?id=creamy-calming-cream-1" -UseBasicParsing | Out-Null}catch{$code=[int]$_.Exception.Response.StatusCode}
 Check 'Legacy product URL returns 404' ($code -eq 404)
 $session=New-Object Microsoft.PowerShell.Commands.WebRequestSession
 $state=Invoke-RestMethod "$base/api/admin/session" -WebSession $session
 Invoke-RestMethod "$base/api/admin/login" -Method Post -WebSession $session -Headers @{'X-CSRF-Token'=$state.csrf} -ContentType 'application/json' -Body '{"username":"admin","password":"catalog-review-test-only-2026"}' | Out-Null
 $data=Invoke-RestMethod "$base/api/admin/data" -WebSession $session
 Check 'Admin retains the 119 legacy records for review' ($data.store.produtos.Count -eq 119)
 Check 'Admin explicitly reports that saving does not publish offers' ($data.catalogReview -eq $true)
 [IO.File]::WriteAllText((Join-Path $testPath 'transactions.json'),'{"review-order":{"amount":100,"status":"PENDING","paymentMethod":"manual_pix","createdAt":1}}')
 $order=Invoke-RestMethod "$base/api/payments/review-order"
 Check 'Existing order status remains accessible' ($order.success -and $order.data.status -eq 'PENDING')
 Write-Output 'Catalog review checks passed without external charges.'
} finally {
 if($server -and !$server.HasExited){Stop-Process -Id $server.Id -Force}
 if($server){$server.WaitForExit(5000)|Out-Null;$server.Dispose()}
 foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$previous[$name],'Process')}
 $safeRoot=[IO.Path]::GetFullPath((Join-Path $root '.runtime')).TrimEnd('\')+'\'
 $resolved=[IO.Path]::GetFullPath($testPath)
 if($resolved.StartsWith($safeRoot,[StringComparison]::OrdinalIgnoreCase) -and (Split-Path $resolved -Leaf).StartsWith('test-review-')){Remove-Item -LiteralPath $resolved -Recurse -Force}
}
