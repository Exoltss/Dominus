# 🔧 Instalación Manual de Node.js (Si todo falla)

Si ningún script funciona, instala Node.js manualmente:

## Opción 1: Node.js 20 (Recomendado)

```bash
# Descargar Node.js 20
cd /tmp
wget https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz

# Extraer
tar -xf node-v20.11.0-linux-x64.tar.xz

# Mover a ubicación sistema
sudo mv node-v20.11.0-linux-x64 /usr/local/nodejs

# Crear enlaces simbólicos
sudo ln -s /usr/local/nodejs/bin/node /usr/bin/node
sudo ln -s /usr/local/nodejs/bin/npm /usr/bin/npm
sudo ln -s /usr/local/nodejs/bin/npx /usr/bin/npx

# Verificar
node -v
npm -v
```

## Opción 2: Node.js 16 (Más compatible con Ubuntu antiguo)

```bash
# Descargar Node.js 16
cd /tmp
wget https://nodejs.org/dist/v16.20.2/node-v16.20.2-linux-x64.tar.xz

# Extraer
tar -xf node-v16.20.2-linux-x64.tar.xz

# Mover a ubicación sistema
sudo mv node-v16.20.2-linux-x64 /usr/local/nodejs

# Crear enlaces simbólicos
sudo ln -s /usr/local/nodejs/bin/node /usr/bin/node
sudo ln -s /usr/local/nodejs/bin/npm /usr/bin/npm
sudo ln -s /usr/local/nodejs/bin/npx /usr/bin/npx

# Verificar
node -v
npm -v
```

## Opción 3: Usar NVM (Node Version Manager)

```bash
# Instalar NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Recargar terminal
source ~/.bashrc

# Instalar Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verificar
node -v
npm -v
```

## Opción 4: Docker (No necesitas instalar Node.js)

Esta es la mejor opción si nada funciona:

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar tu usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Verificar
docker --version

# Luego usa docker-compose para correr el bot
cd /home/crypto-escrow-bot
docker-compose up -d
```

## 🔍 Diagnóstico del problema

Si sigues con problemas, ejecuta esto para ver qué pasa:

```bash
# Ver versión de Ubuntu
lsb_release -a

# Ver arquitectura
uname -m

# Ver si tienes permisos sudo
sudo whoami

# Verificar conectividad
curl -I https://deb.nodesource.com

# Ver errores específicos al instalar
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>&1 | tee node-install.log
cat node-install.log
```

Envíame la salida de estos comandos si sigues teniendo problemas.

## ⚠️ Ubuntu muy antiguo (14.04 o anterior)

Si tienes Ubuntu 14.04 o más antiguo:

```bash
# Solo Node.js 10 funciona (muy antiguo, NO recomendado)
curl -fsSL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt install -y nodejs
```

**PERO** el bot puede no funcionar bien con Node.js 10. En ese caso:
1. **Actualiza Ubuntu** a una versión más reciente (20.04 o 22.04)
2. O usa **Docker** (funciona en cualquier Ubuntu)
3. O cambia de proveedor de VPS
