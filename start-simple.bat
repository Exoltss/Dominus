@echo off
REM Alternativa simple - Sin PM2

title Crypto Bot

REM Ir a la carpeta del bot
cd /d "%~dp0"

REM Crear VBS para ejecutar sin ventana
echo Set WshShell = CreateObject("WScript.Shell") > start-hidden.vbs
echo WshShell.Run "cmd /c cd /d %~dp0 && npm start", 0, False >> start-hidden.vbs

echo Iniciando bot en segundo plano...
cscript //nologo start-hidden.vbs

echo Bot iniciado! (sin ventanas)
timeout /t 3
exit
