#!/bin/bash
# Script alternativo de instalación Node.js para Ubuntu
# Probar estos métodos en orden hasta que uno funcione

echo "🔧 Método 1: NodeSource - Node.js 20 (Más nuevo)"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar
if command -v node &> /dev/null; then
    echo "✅ Node.js instalado: $(node -v)"
    exit 0
fi

echo "❌ Método 1 falló, probando Método 2..."

echo "🔧 Método 2: Repositorio de Ubuntu"
sudo apt update
sudo apt install -y nodejs npm

# Verificar
if command -v node &> /dev/null; then
    echo "✅ Node.js instalado: $(node -v)"
    exit 0
fi

echo "❌ Método 2 falló, probando Método 3..."

echo "🔧 Método 3: NodeSource - Node.js 16 (Más compatible)"
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar
if command -v node &> /dev/null; then
    echo "✅ Node.js instalado: $(node -v)"
    exit 0
fi

echo "❌ Método 3 falló, probando Método 4..."

echo "🔧 Método 4: NVM (Node Version Manager)"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20

# Verificar
if command -v node &> /dev/null; then
    echo "✅ Node.js instalado con NVM: $(node -v)"
    exit 0
fi

echo "❌ Método 4 falló, probando Método 5..."

echo "🔧 Método 5: Instalación manual Node.js 20"
cd /tmp
wget https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz
tar -xf node-v20.11.0-linux-x64.tar.xz
sudo mv node-v20.11.0-linux-x64 /usr/local/node
sudo ln -s /usr/local/node/bin/node /usr/bin/node
sudo ln -s /usr/local/node/bin/npm /usr/bin/npm

# Verificar
if command -v node &> /dev/null; then
    echo "✅ Node.js instalado manualmente: $(node -v)"
    exit 0
fi

echo "❌ Todos los métodos fallaron. Información del sistema:"
echo "Ubuntu version: $(lsb_release -a)"
echo "Architecture: $(uname -m)"
echo "User: $(whoami)"
echo "Permissions: $(groups)"
