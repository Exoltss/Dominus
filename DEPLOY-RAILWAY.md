# 🚀 Deploy en Railway - Guía Anti-Crash

## ⚠️ Problema Actual

El [`railway.json`](railway.json) tiene scripts incorrectos. Voy a arreglarlo para que no crashee:

---

## Paso 1: Actualizar railway.json

El archivo debe usar los scripts correctos de [`package.json`](package.json):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npx prisma generate && npm run build"
  },
  "deploy": {
    "startCommand": "npx prisma migrate deploy && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## Paso 2: Variables de Entorno en Railway

En Railway, agrega estas variables en el panel del proyecto:

### Obligatorias:
```
DISCORD_TOKEN=tu_token_discord
DISCORD_CLIENT_ID=tu_client_id
DISCORD_GUILD_ID=tu_guild_id

# Railway genera DATABASE_URL automáticamente
# No la necesitas configurar

ENCRYPTION_KEY=openssl rand -hex 32
NODE_ENV=production
BOT_FEE_PERCENTAGE=2.0
ADMIN_USER_IDS=tu_discord_user_id
```

### Opcionales (testnet por defecto):
```
BITCOIN_NETWORK=testnet
ETHEREUM_NETWORK=goerli
SOLANA_NETWORK=devnet
LITECOIN_NETWORK=testnet
```

---

## Paso 3: Errores Comunes y Soluciones

### ❌ Error: "Cannot find module"
**Solución:** Railway ya compila. Asegúrate que `npm run build` funciona localmente.

### ❌ Error: "ECONNREFUSED database"
**Solución:** 
1. Ve a Railway → tu proyecto → Databases
2. Agrega "PostgreSQL"
3. Railway autodefine `DATABASE_URL`

### ❌ Error: "Discord token invalid"
**Solución:** Verifica que `DISCORD_TOKEN` es el token real (no client secret).

### ❌ Error: "Prisma migration failed"
**Solución:** En Railway, corre esto en la terminal:
```bash
npx prisma migrate deploy
```

---

## Paso 4: Configurar Auto-Restart (Anti-Crash)

Railway ya tiene restart automático configurado en [`railway.json`](railway.json):
```json
"restartPolicyType": "ON_FAILURE",
"restartPolicyMaxRetries": 10
```

Esto reiniciará hasta 10 veces si falla.

---

## Paso 5: Monitoreo

1. **Railway Dashboard:** Muestra logs en tiempo real
2. **PM2 equivalent:** No necesitas, Railway maneja eso
3. **Discord:** El bot debe aparecer Online

---

## 🆘 Si Crashea

### Ver logs:
```
Railway → tu proyecto → Deployments → View Logs
```

### Retry manual:
```
Railary → tu proyecto → Deployments → Retry
```

---

## ✅ Checklist Pre-Deploy

- [ ] Token de Discord válido
- [ ] Client ID y Guild ID correctos
- [ ] PostgreSQL agregado en Railway
- [ ] ENCRYPTION_KEY generada (`openssl rand -hex 32`)
- [ ] Probado localmente con `npm run build`
- [ ] NODE_ENV=production

---

## 💡 Tips Extra

1. **Empieza en testnet** - Evita perder dinero real
2. **Sube el plan** - $5/mes tiene 512MB RAM, suficiente para empezar
3. **Backups** - Railway hace backups automáticos de PostgreSQL
4. **Dominio** - Railway te da un dominio gratuito (ej: `tu-proyecto.up.railway.app`)

---

## 🚀 Comandos Útiles en Railway

```bash
# En la terminal de Railway:
npx prisma migrate deploy  # Migrar DB
npx prisma generate        # Generar cliente
npm run build              # Compilar
npm start                 # Iniciar bot
```
