# 🖥️ Hostear Bot en PC Windows - Guía Rápida

## ⚡ Instalación Rápida (5 minutos)

### 1️⃣ Descargar e Instalar (si no los tienes)
- **Node.js**: https://nodejs.org/ (versión LTS - click "Descargar")
- **PostgreSQL**: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
  - Durante instalación: contraseña `postgres123` (o la que quieras)
  - Puerto: `5432`

### 2️⃣ Ejecutar Script Automático
Doble click en: **`install-service.bat`**

¡Listo! El bot ya corre en segundo plano.

---

## 🔧 Configuración Manual (solo si el script falla)

### 1. Configurar Variables de Entorno
```cmd
copy .env.example .env
notepad .env
```

Edita solo estas líneas MÍNIMAS:
```env
DISCORD_TOKEN=tu_token_de_discord
DISCORD_CLIENT_ID=tu_client_id
DISCORD_GUILD_ID=tu_server_id
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/crypto_escrow?schema=public"
ENCRYPTION_KEY=abc123def456abc123def456abc123def456abc123def456abc123def456abc1
NODE_ENV=production
ADMIN_USER_IDS=tu_discord_user_id
```

### 2. Crear Base de Datos
```cmd
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE crypto_escrow;"
```

### 3. Instalar Bot
```cmd
cd C:\Users\sauce\crypto-escrow-bot
npm install
npx prisma migrate deploy
npm run build
```

### 4. Iniciar como Servicio
```cmd
npm install -g pm2 pm2-windows-startup
pm2-startup install
pm2 start npm --name "crypto-bot" -- start
pm2 save
```

---

## 📊 Comandos Útiles

```cmd
pm2 status              # Ver estado del bot
pm2 logs crypto-bot     # Ver logs en tiempo real
pm2 restart crypto-bot  # Reiniciar bot
pm2 stop crypto-bot     # Detener bot
pm2 monit               # Monitor de recursos
```

---

## ⚙️ Configuración PC para 24/7

### Evitar Suspensión:
1. `Win + I` → **Sistema** → **Energía**
2. **Suspensión**: Nunca
3. **Pantalla apagada**: 10 minutos (ahorra energía)

### Verificar que corre en segundo plano:
- El bot NO muestra ventanas
- Aparece ONLINE en Discord
- Reinicia automáticamente si hay error
- Se inicia solo al encender PC

---

## 🛠️ Solución de Problemas

**Bot no aparece online:**
```cmd
pm2 logs crypto-bot --lines 30
```

**Actualizar bot:**
```cmd
cd C:\Users\sauce\crypto-escrow-bot
pm2 stop crypto-bot
npm run build
pm2 restart crypto-bot
```

**Reiniciar todo:**
```cmd
pm2 restart crypto-bot
```
