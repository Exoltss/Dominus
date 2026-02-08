@echo off
REM Arreglar PM2 en Windows

title Arreglando PM2

echo Limpiando PM2...

REM Matar procesos PM2
taskkill /F /IM PM2.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1

REM Borrar carpeta PM2
rd /s /q "%USERPROFILE%\.pm2" 2>nul

echo PM2 limpiado. Presiona cualquier tecla para reiniciar el bot...
pause >nul

REM Ir a la carpeta del bot
cd /d "%~dp0"

echo.
echo Iniciando bot...
call npm install -g pm2 pm2-windows-startup
call pm2 kill
call pm2-startup install
call pm2 start npm --name "crypto-bot" -- start
call pm2 save

echo.
echo Listo! Verifica el estado:
call pm2 status

echo.
pause
