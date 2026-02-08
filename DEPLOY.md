# 🚀 Guía de Deployment en VPS

## Paso 1: Conectarse a tu VPS

Desde tu PC local (PowerShell o CMD):
```bash
ssh root@TU_IP_VPS
# O si tienes usuario no-root:
ssh usuario@TU_IP_VPS
```

## Paso 2: Subir archivos al VPS

### Opción A: Con Git (Recomendado)
```bash
# En el VPS:
cd /home/
git clone https://github.com/TU_USUARIO/crypto-escrow-bot.git
cd crypto-escrow-bot
```

### Opción B: Con SCP (desde tu PC)
```bash
# Desde tu PC Windows (PowerShell):
scp -r C:\Users\sauce\crypto-escrow-bot root@TU_IP_VPS:/home/
```

### Opción C: Con SFTP
Usar FileZilla o WinSCP para transferir la carpeta `crypto-escrow-bot`

## Paso 3: Ejecutar script de instalación

```bash
# En el VPS:
cd /home/crypto-escrow-bot
chmod +x deploy-vps.sh
bash deploy-vps.sh
```

## Paso 4: Configurar variables de entorno

```bash
nano .env
```

**Configuración mínima requerida:**
```env
# Discord
DISCORD_TOKEN=tu_token_aqui
DISCORD_CLIENT_ID=tu_client_id
DISCORD_GUILD_ID=tu_server_id

# Database (cambiar la contraseña)
DATABASE_URL="postgresql://bot_user:ChangeThisPassword123!@localhost:5432/crypto_escrow?schema=public"

# Security (generar con: openssl rand -hex 32)
ENCRYPTION_KEY=tu_encryption_key_de_64_caracteres
MASTER_SEED_PHRASE=tus 24 palabras del seed phrase

# Blockchain APIs
ALCHEMY_API_KEY=tu_alchemy_key
BLOCKSTREAM_API_URL=https://blockstream.info/api
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Environment
NODE_ENV=production
BOT_FEE_PERCENTAGE=2.0

# Admin
ADMIN_USER_IDS=tu_discord_user_id
```

Guardar: `CTRL + X`, luego `Y`, luego `ENTER`

## Paso 5: Iniciar el bot

```bash
# Compilar TypeScript (si no se hizo en el script)
npm run build

# Iniciar con PM2
pm2 start npm --name "crypto-bot" -- start

# Guardar configuración PM2
pm2 save

# Configurar PM2 para auto-inicio
pm2 startup

# Copiar y ejecutar el comando que PM2 te muestra
```

## Paso 6: Verificar que funciona

```bash
# Ver logs en tiempo real
pm2 logs crypto-bot

# Ver estado
pm2 status

# Reiniciar bot
pm2 restart crypto-bot

# Detener bot
pm2 stop crypto-bot
```

## 🔒 Seguridad Adicional

### Configurar Firewall
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw enable
```

### Crear usuario no-root
```bash
adduser botuser
usermod -aG sudo botuser
# Luego usar ese usuario en lugar de root
```

### Backups automáticos de DB
```bash
# Crear script de backup
nano /home/backup-db.sh
```

```bash
#!/bin/bash
pg_dump crypto_escrow > /home/backups/crypto_escrow_$(date +%Y%m%d_%H%M%S).sql
find /home/backups -mtime +7 -delete  # Borrar backups > 7 días
```

```bash
chmod +x /home/backup-db.sh
# Agregar a crontab (diario a las 3 AM)
crontab -e
# Agregar: 0 3 * * * /home/backup-db.sh
```

## 📊 Comandos útiles de PM2

```bash
pm2 list              # Listar procesos
pm2 logs crypto-bot   # Ver logs
pm2 monit             # Monitor en tiempo real
pm2 restart crypto-bot # Reiniciar
pm2 stop crypto-bot    # Detener
pm2 delete crypto-bot  # Eliminar proceso
```

## 🆘 Troubleshooting

### Bot no inicia
```bash
pm2 logs crypto-bot --lines 50  # Ver últimos 50 logs
```

### Error de base de datos
```bash
# Verificar PostgreSQL
sudo systemctl status postgresql
# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### Error de permisos
```bash
sudo chown -R $USER:$USER /home/crypto-escrow-bot
```

### Actualizar el bot
```bash
cd /home/crypto-escrow-bot
git pull  # Si usas Git
npm install
npm run build
pm2 restart crypto-bot
```

## 🌐 Extras: Configurar Dominio (Opcional)

Si quieres acceder a tu VPS con un dominio:
1. Comprar dominio (Namecheap, GoDaddy, etc)
2. Agregar registro A apuntando a tu IP VPS
3. Instalar Nginx como reverse proxy si tienes web panel

---

**⚠️ IMPORTANTE**: 
- Cambiar TODAS las contraseñas por defecto
- Hacer backup del `.env` y `MASTER_SEED_PHRASE` 
- Nunca compartir tu archivo `.env`
- Probar primero en testnet antes de mainnet
