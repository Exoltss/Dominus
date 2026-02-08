#!/bin/bash
# Script de instalación para VPS Ubuntu/Debian
# Ejecutar como: bash deploy-vps.sh

echo "🚀 Iniciando instalación del Crypto Escrow Bot..."

# Actualizar sistema
echo "📦 Actualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20.x (o prueba con 16.x si falla)
echo "📦 Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Si falla, intentar con Node.js 16 (más compatible)
if ! command -v node &> /dev/null; then
    echo "⚠️ Node.js 20 falló, intentando con Node.js 16..."
    curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Verificar instalación
echo "✅ Node.js versión: $(node -v)"
echo "✅ NPM versión: $(npm -v)"

# Instalar PostgreSQL
echo "📦 Instalando PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Instalar PM2 globalmente
echo "📦 Instalando PM2..."
sudo npm install -g pm2

# Crear usuario y base de datos PostgreSQL
echo "🗄️ Configurando PostgreSQL..."
sudo -u postgres psql <<EOF
CREATE DATABASE crypto_escrow;
CREATE USER bot_user WITH PASSWORD 'ChangeThisPassword123!';
GRANT ALL PRIVILEGES ON DATABASE crypto_escrow TO bot_user;
\q
EOF

echo "✅ Base de datos creada: crypto_escrow"

# Instalar dependencias del bot
echo "📦 Instalando dependencias del bot..."
npm install

# Generar Prisma Client
echo "🔧 Generando Prisma Client..."
npx prisma generate

# Ejecutar migraciones
echo "🔧 Ejecutando migraciones de base de datos..."
npx prisma migrate deploy

# Compilar TypeScript
echo "🔨 Compilando TypeScript..."
npm run build

echo ""
echo "✅ ¡Instalación completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Editar archivo .env con tus credenciales:"
echo "   nano .env"
echo ""
echo "2. Iniciar el bot con PM2:"
echo "   pm2 start npm --name \"crypto-bot\" -- start"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "3. Verificar logs:"
echo "   pm2 logs crypto-bot"
echo ""
