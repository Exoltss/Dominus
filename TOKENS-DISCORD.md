# 🤖 Cómo Obtener Tokens de Discord

## 1️⃣ Crear Bot en Discord Developer Portal

### Paso 1: Ir al Portal
- Ve a: https://discord.com/developers/applications
- Inicia sesión con tu cuenta de Discord

### Paso 2: Crear Aplicación
1. Click en **"New Application"** (arriba derecha)
2. Nombre: `Crypto Escrow Bot` (o el que quieras)
3. Acepta términos → **Create**

### Paso 3: Obtener CLIENT ID
1. Estás en la pestaña **"General Information"**
2. Busca: **"APPLICATION ID"**
3. Click en **"Copy"** 
4. ✅ Guárdalo - Este es tu **CLIENT_ID**

### Paso 4: Crear Bot
1. Click en **"Bot"** en el menú izquierdo
2. Click en **"Add Bot"** → **"Yes, do it!"**
3. En **"TOKEN"**, click en **"Reset Token"** → **"Yes, do it!"**
4. Click en **"Copy"**
5. ✅ Guárdalo - Este es tu **DISCORD_TOKEN**

⚠️ **NUNCA compartas este token con nadie**

### Paso 5: Configurar Permisos del Bot
En la misma página de **Bot**:

1. Scroll hasta **"Privileged Gateway Intents"**
2. Activa estos 3:
   - ✅ **PRESENCE INTENT**
   - ✅ **SERVER MEMBERS INTENT**  
   - ✅ **MESSAGE CONTENT INTENT**
3. **Save Changes**

### Paso 6: Invitar Bot a tu Servidor
1. Click en **"OAuth2"** → **"URL Generator"** (menú izquierdo)
2. En **SCOPES**, marca:
   - ✅ `bot`
   - ✅ `applications.commands`
3. En **BOT PERMISSIONS**, marca:
   - ✅ Administrator (o selecciona permisos específicos)
4. Copia la **URL** que aparece abajo
5. Pega la URL en tu navegador
6. Selecciona tu servidor → **Autorizar**

---

## 2️⃣ Obtener GUILD ID (ID de tu Servidor)

### Activar Modo Desarrollador
1. Abre **Discord** (app o navegador)
2. Click en ⚙️ **Configuración de Usuario** (abajo izquierda)
3. **Avanzado** → Activa **"Modo de desarrollador"**
4. Cerrar configuración

### Copiar Guild ID
1. Click derecho en el **icono de tu servidor** (barra izquierda)
2. **"Copiar ID del servidor"**
3. ✅ Guárdalo - Este es tu **GUILD_ID**

---

## 3️⃣ Obtener tu USER ID (Admin)

1. En Discord, click derecho en **tu nombre de usuario**
2. **"Copiar ID de usuario"**
3. ✅ Guárdalo - Este es tu **ADMIN_USER_IDS**

---

## 📝 Resumen - Tus Tokens

Deberías tener estos 4 valores:

```env
DISCORD_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4.AbCdEf.GhIjKlMnOpQrStUvWxYz1234567890
DISCORD_CLIENT_ID=1234567890123456789
DISCORD_GUILD_ID=9876543210987654321
ADMIN_USER_IDS=1122334455667788990
```

---

## 🔧 Poner Tokens en el Bot

1. Abre: `C:\Users\sauce\crypto-escrow-bot\.env` con Notepad
2. Pega tus valores:

```env
DISCORD_TOKEN=TU_TOKEN_AQUI
DISCORD_CLIENT_ID=TU_CLIENT_ID_AQUI
DISCORD_GUILD_ID=TU_GUILD_ID_AQUI
ADMIN_USER_IDS=TU_USER_ID_AQUI

DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/crypto_escrow?schema=public"

ENCRYPTION_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef
NODE_ENV=production
BOT_FEE_PERCENTAGE=2.0

# Blockchain (para testnet primero)
BITCOIN_NETWORK=testnet
ETHEREUM_NETWORK=goerli
SOLANA_NETWORK=devnet
BLOCKSTREAM_API_URL=https://blockstream.info/testnet/api
```

3. **Guardar** con CTRL+S
4. Cerrar

---

## ✅ Siguiente Paso

Ahora ejecuta: **`install-service.bat`** como administrador

El bot se instalará y aparecerá **ONLINE** en tu servidor de Discord. 🎉

---

## 🆘 Problemas Comunes

**"Invalid Token"**
- Regenera el token en Discord Developer Portal
- Copia bien sin espacios extras

**"Missing Access"**  
- Verifica que invitaste el bot a tu servidor
- Verifica que el GUILD_ID es correcto

**"Insufficient Permissions"**
- Dale permisos de Administrator al bot en tu servidor
- O configura permisos específicos necesarios
