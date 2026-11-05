@echo off
title Votacao Live - Iniciando...
color 0B

echo =====================================
echo        DISPUTA DA LIVE
echo =====================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Instale em: https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION%
echo.

if not exist "node_modules\" (
    echo [!] Instalando dependencias...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar!
        pause
        exit /b 1
    )
)

echo.
echo Iniciando servidor e connector...
echo.

start "Votacao Live - SERVIDOR" cmd /k "node server/server.js"
timeout /t 2 /nobreak >nul
start "Votacao Live - CONNECTOR" cmd /k "node connector/tiktok.js"
timeout /t 3 /nobreak >nul

echo Abrindo o jogo no navegador...
start http://localhost:3000

echo.
echo =====================================
echo   TUDO RODANDO!
echo =====================================
echo.
echo Digite seu @username na janela do CONNECTOR
echo.
pause