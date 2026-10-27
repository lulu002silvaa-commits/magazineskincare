@echo off
setlocal
cd /d "%~dp0"
echo Loja: http://127.0.0.1:8080
echo Painel: http://127.0.0.1:8080/admin.php
echo Mantenha esta janela aberta enquanto usa a loja.
if exist ".runtime\php\php.exe" (
  ".runtime\php\php.exe" -c php-local.ini -S 127.0.0.1:8080 router.php
  goto resultado
)
where php >nul 2>nul
if not errorlevel 1 (
  php -S 127.0.0.1:8080 router.php
  goto resultado
)
echo PHP nao encontrado. Instale PHP 8.2 ou superior.
pause
exit /b 1
:resultado
if errorlevel 1 (
  echo Nao foi possivel iniciar. Confira se outra janela ja esta usando a porta 8080.
  pause
)
endlocal