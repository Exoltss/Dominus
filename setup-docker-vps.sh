#!/bin/bash
# Script completo de setup para VPS Ubuntu con Docker

echo "🚀 Instalando Docker y Docker Compose..."

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo apt update
sudo apt install -y docker-compose

# Agregar usuario actual al grupo docker
sudo usermod -aG docker $USER

# Iniciar Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verificar instalación
echo "✅ Docker version:"
docker --version

echo "✅ Docker Compose version:"
docker-compose --version

echo ""
echo "🎉 Docker instalado correctamente!"
echo ""
echo "⚠️ IMPORTANTE: Debes cerrar sesión y volver a conectarte para usar Docker sin sudo"
echo ""
echo "Próximos pasos:"
echo "1. Sube la carpeta 'crypto-escrow-bot' a /root/ o /home/"
echo "2. cd /root/crypto-escrow-bot (o donde la subiste)"
echo "3. Edita el archivo .env con tus credenciales"
echo "4. docker-compose up -d"
