# Alternativas Gratuitas o Baratas

## 🥇 Render (Recomendado)

Similar a Railway pero con tier gratuito:
- **Free:** 750 horas/mes
- PostgreSQL: $5/mes (necesario para tu bot)
- **Total:** ~$5/mes

### Cómo hacer deploy:
1. Ve a [render.com](https://render.com)
2. "New Web Service" → conecta GitHub
3. Build command: `npm install && npx prisma generate && npm run build`
4. Start command: `npx prisma migrate deploy && npm start`
5. Agrega las mismas variables de entorno

---

## 🥈 Fly.io

- **Free:** 3 VMs shared CPU
- PostgreSQL: $5/mes
- **Total:** ~$5/mes

### Instalar CLI:
```bash
curl -L https://fly.io/install.sh | sh
fly auth login
fly launch
```

---

## 🥉 Glitch (Solo testing)

- **Free** pero el bot se duerme si no hay actividad
- No es ideal para producción 24/7

---

## 🏆 Alternativa Más Barata: Contabo (€4.99/mes)

Si quieres VPS real:
- **Contabo:** €4.99/mes (CPU 4 cores, 8GB RAM, 200GB SSD)
- Ubuntu 22.04
- Instalas PostgreSQL tú mismo

Guía en [`DEPLOY.md`](DEPLOY.md)

---

## 💡 Mi Recomendación

| Opción | Costo | Dificultad |
|--------|-------|-------------|
| **Render + PostgreSQL** | $5/mes | Fácil |
| **Contabo VPS** | €4.99/mes | Media local** | $ |
| **PC0 | Muy fácil |

**Para empezar rápido:** Render es la opción más similar a Railway y funciona bien.