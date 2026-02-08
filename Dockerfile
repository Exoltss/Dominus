FROM node:20-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache python3 make g++ postgresql-client

# Crear directorio de trabajo
WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm ci --omit=dev

# Copiar código fuente
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# Exponer puerto (si tienes API web)
# EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"]
