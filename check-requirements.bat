@echo off
REM Script para verificar requisitos en Windows

echo Verificando Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado
    echo Descarga desde: https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Verificando npm...
npm --version

echo.
echo Verificando PostgreSQL...
psql --version
if %errorlevel% neq 0 (
    echo ADVERTENCIA: PostgreSQL no esta instalado
    echo Descarga desde: https://www.postgresql.org/download/windows/
)

echo.
echo === Verificacion completada ===
pause
