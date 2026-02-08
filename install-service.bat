@echo off
REM Instalador optimizado - Crypto Escrow Bot

title Instalador Bot

REM Ir al directorio del script
cd /d "%~dp0"

net session >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR] Ejecuta como ADMINISTRADOR
    echo Click derecho ^> Ejecutar como administrador
    echo.
    pause
    exit /b 1
)

color 0A
echo.
echo ======================================
echo   CRYPTO ESCROW BOT - INSTALADOR
echo ======================================
echo.

REM Verificar Node.js
echo [1/6] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [X] Node.js no instalado
    echo Descarga: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js instalado

REM Verificar .env
echo.
echo [2/6] Verificando configuracion...
if not exist .env (
    copy .env.example .env
    color 0E
    echo.
    echo [!] IMPORTANTE: Edita el archivo .env con tus tokens
    echo.
    notepad .env
)

REM Crear base de datos
echo.
echo [3/6] Configurando base de datos...
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE crypto_escrow;" 2>nul
if %errorlevel% neq 0 (
    "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -c "CREATE DATABASE crypto_escrow;" 2>nul
)
echo [OK] Base de datos lista

REM Instalar dependencias
echo.
echo [4/6] Instalando dependencias (puede tardar 1-2 min)...
call npm install --silent
call npx prisma generate >nul
call npx prisma migrate deploy >nul

REM Compilar
echo.
echo [5/6] Compilando...
call npm run build >nul
if %errorlevel% neq 0 (
    color 0C
    echo [X] Error al compilar
    pause
    exit /b 1
)
echo [OK] Compilado

REM Configurar PM2
echo.
echo [6/6] Instalando como servicio...
call npm install -g pm2 pm2-windows-startup --silent
call pm2-startup install >nul
call pm2 delete crypto-bot >nul 2>&1
call pm2 start npm --name "crypto-bot" -- start
call pm2 save

echo.
color 0B
echo ======================================
echo          INSTALACION COMPLETA
echo ======================================
echo.
echo [OK] Bot corriendo en segundo plano
echo [OK] Se inicia automaticamente al encender PC
echo.
echo Comandos:
echo   pm2 status          Ver estado
echo   pm2 logs crypto-bot Ver logs
echo   pm2 restart crypto-bot Reiniciar
echo.
timeout /t 10
exit /b 0
