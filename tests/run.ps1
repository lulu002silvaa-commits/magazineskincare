param([switch]$Browser, [switch]$KeepArtifacts)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $root '.runtime/php/php.exe'
if (!(Test-Path -LiteralPath $runtime)) { $runtime = (Get-Command php -ErrorAction Stop).Source }
$testPath = Join-Path $root ('.runtime/test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testPath -Force | Out-Null
$names = @('STORE_DATA_DIR','STORE_LOAD_ENV','ADMIN_SYNC_PASSWORD','ADMIN_USERNAME','BLACKCAT_API_KEY','TEST_BASE_URL','TEST_DATA_DIR')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name,'Process') }
$process = $null
Push-Location $root
try {
  $env:STORE_DATA_DIR = $testPath
  $env:STORE_LOAD_ENV = '0'
  $env:ADMIN_SYNC_PASSWORD = ''
  $env:ADMIN_USERNAME = 'admin'
  $env:BLACKCAT_API_KEY = ''
  $env:TEST_BASE_URL = 'http://127.0.0.1:8092'
  $env:TEST_DATA_DIR = $testPath
  $process = Start-Process -FilePath $runtime -ArgumentList @('-c','php-local.ini','-S','127.0.0.1:8092','router.php') -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $testPath 'server.log')
  $ready = $false
  for($i=0;$i -lt 50;$i++) {try { $health = Invoke-RestMethod -Uri ($env:TEST_BASE_URL+'/api/health'); if($health.ok){$ready=$true;break} } catch {}; Start-Sleep -Milliseconds 100 }
  if(!$ready){throw 'Servidor de testes não iniciou.'}
  if($process.HasExited){throw 'O processo de testes encerrou. Confira se a porta 8092 está disponível.'}
  & $runtime -c php-local.ini tests/integration.php
  if($LASTEXITCODE -ne 0){throw 'Falha nos testes da API.'}
  if($Browser){& (Join-Path $PSScriptRoot 'browser.ps1')}
} finally {
  if($process -and !$process.HasExited){Stop-Process -Id $process.Id -Force}
  foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$previous[$name],'Process')}
  if(!$KeepArtifacts) {
    $runtimePrefix = [IO.Path]::GetFullPath((Join-Path $root '.runtime')).TrimEnd('\') + '\'
    $testFull = [IO.Path]::GetFullPath($testPath)
    if(!$testFull.StartsWith($runtimePrefix,[StringComparison]::OrdinalIgnoreCase) -or !(Split-Path $testFull -Leaf).StartsWith('test-')) {throw 'Diretório de teste fora do local previsto.'}
    if(Test-Path -LiteralPath $testFull){Remove-Item -LiteralPath $testFull -Recurse -Force}
  }
  Pop-Location
}
