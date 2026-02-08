FROM node:20

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

# Comando de inicio
CMD ["npm", "start"]
