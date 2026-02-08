@echo off
REM Detener bot simple

taskkill /F /IM node.exe /FI "WINDOWTITLE eq *crypto-escrow-bot*" 2>nul
if %errorlevel% equ 0 (
    echo Bot detenido
) else (
    echo No se encontro el bot corriendo
)
pause
