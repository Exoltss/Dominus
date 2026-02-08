# 🚀 INICIO RÁPIDO - 3 Pasos

## 1️⃣ Instalar Requisitos (Si no los tienes)

**Node.js**: https://nodejs.org/
- Descargar LTS → Instalar → Next, Next, Finish

**PostgreSQL**: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads  
- Versión 15 para Windows
- Contraseña: `postgres123` (o la que quieras, recuérdala)
- Puerto: `5432`
- Siguiente hasta terminar

## 2️⃣ Configurar Tokens

1. Abre el archivo **`.env`** con Notepad
2. Edita SOLO estas líneas:

```env
DISCORD_TOKEN=tu_token_aqui
DISCORD_CLIENT_ID=tu_client_id  
DISCORD_GUILD_ID=tu_server_id
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/crypto_escrow?schema=public"
ADMIN_USER_IDS=tu_discord_user_id
```

3. Guarda y cierra

## 3️⃣ Instalar Bot

**Click derecho en `install-service.bat` → Ejecutar como administrador**

✅ Listo! El bot corre en segundo plano.

---

## 📱 Comandos Rápidos

Abre CMD (no hace falta admin):

```cmd
pm2 status              # Ver si está corriendo
pm2 logs crypto-bot     # Ver logs
pm2 restart crypto-bot  # Reiniciar
```

---

## ⚙️ Configuración Extra (Opcional pero Recomendado)

**Para que tu PC no se suspenda:**
1. Presiona `Win + I`
2. **Sistema** → **Energía**  
3. **Suspensión**: Nunca
4. **Pantalla**: 10 minutos (ahorra luz)

---

## ❓ Problemas Comunes

**"No se reconoce como comando"**
- Reinicia CMD después de instalar Node.js

**"Database connection failed"**
- Verifica que PostgreSQL esté corriendo
- Revisa la contraseña en el `.env`

**Bot offline en Discord**
- Revisa: `pm2 logs crypto-bot`
- Verifica los tokens en `.env`

---

## 🎯 Ventajas de hostear en PC

✅ **GRATIS** (sin pagar VPS)  
✅ **Sin ventanas** (corre en segundo plano)  
✅ **Auto-inicio** (se inicia al encender PC)  
✅ **Optimizado** (bajo consumo de recursos)

❌ **Tu PC debe estar encendida 24/7**

---

**¿Dudas?** Revisa `HOSTEAR-EN-PC.md` para más detalles.
