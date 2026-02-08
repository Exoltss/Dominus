# Crypto Escrow Bot - Discord

Bot automatizado de Discord para escrow de criptomonedas con soporte para BTC, ETH, SOL, LTC, USDT y USDC.

## 🚀 Características

- ✅ Escrow automatizado para múltiples criptomonedas
- 🔐 Wallets únicas generadas por transacción
- 📊 Monitoreo en tiempo real de blockchain
- 🛡️ Sistema de seguridad multi-capa
- 💬 Sistema de disputas y soporte
- 👥 Panel de administración

## 📋 Requisitos Previos

- Node.js 18+ 
- PostgreSQL 14+
- Redis (opcional pero recomendado)
- Discord Bot Token
- API Keys de blockchain providers

## 🛠️ Instalación

1. **Clonar e instalar dependencias:**
```bash
npm install
```

2. **Configurar variables de entorno:**
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

3. **Configurar base de datos:**
```bash
npx prisma generate
npx prisma migrate dev
```

4. **Compilar TypeScript:**
```bash
npm run build
```

5. **Iniciar bot:**
```bash
npm start
```

## 🔧 Comandos Disponibles

### Desarrollo
- `npm run dev` - Modo desarrollo con hot-reload
- `npm run build` - Compilar TypeScript
- `npm start` - Iniciar bot en producción
- `npm test` - Ejecutar tests

### Base de datos
- `npx prisma studio` - Abrir Prisma Studio (GUI)
- `npx prisma migrate dev` - Crear migración
- `npx prisma generate` - Generar Prisma Client

## 📖 Uso del Bot

### Para Compradores
1. Esperar a que el vendedor cree un deal con `/create-deal`
2. Depositar fondos a la dirección proporcionada
3. Esperar confirmaciones de blockchain
4. Recibir producto/servicio del vendedor
5. Confirmar con `/confirm-received [Deal ID]`

### Para Vendedores
1. Crear deal: `/create-deal @buyer [amount] [crypto] [descripción]`
2. Esperar depósito del comprador
3. Entregar producto/servicio
4. Esperar confirmación del comprador
5. Recibir fondos automáticamente

## 🏗️ Estructura del Proyecto

```
crypto-escrow-bot/
├── src/
│   ├── bot/              # Discord bot logic
│   ├── blockchain/       # Blockchain integrations
│   ├── escrow/          # Core escrow logic
│   ├── database/        # DB models
│   ├── utils/           # Utilities
│   └── config/          # Configuration
├── prisma/              # Prisma schema
├── tests/               # Test suite
└── docs/                # Documentation
```

## ⚠️ Advertencias de Seguridad

- **NUNCA** compartir tu archivo `.env`
- **NUNCA** commitear private keys al repositorio
- Usar testnet antes de mainnet
- Implementar cold storage para fondos grandes
- Consultar con expertos legales sobre regulaciones locales

## 🔐 Seguridad

- Private keys encriptadas con AES-256
- Sistema de auditoría completo
- Rate limiting en todos los comandos
- Sistema de permisos multi-nivel
- Backups automáticos de base de datos

## 📝 Licencia

MIT License - Ver LICENSE para más detalles

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor abre un issue primero para discutir cambios mayores.

## 📞 Soporte

Para reportar bugs o solicitar features, abre un issue en GitHub.

## ⚖️ Legal

Este software es proporcionado "as is". Los usuarios son responsables de cumplir con todas las regulaciones locales e internacionales relacionadas con servicios de dinero y criptomonedas.
