# 🐳 Deployment con Docker (Alternativa sin instalar Node.js directamente)

Si tu VPS tiene problemas con Node.js, usa Docker para encapsular todo.

## Paso 1: Instalar Docker en Ubuntu

```bash
# Actualizar sistema
sudo apt update

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Verificar instalación
docker --version
```

## Paso 2: Crear Dockerfile en tu proyecto

Ya lo agregué en el proyecto como `Dockerfile`

## Paso 3: Crear docker-compose.yml

Ya lo agregué en el proyecto como `docker-compose.yml`

## Paso 4: Subir archivos al VPS

```bash
# Desde tu PC con WinSCP/FileZilla, subir toda la carpeta crypto-escrow-bot
# O con SCP:
scp -r C:\Users\sauce\crypto-escrow-bot root@TU_IP_VPS:/home/
```

## Paso 5: Configurar .env

```bash
cd /home/crypto-escrow-bot
cp .env.example .env
nano .env
# Editar con tus credenciales reales
```

## Paso 6: Iniciar con Docker

```bash
# Construir y ejecutar
docker-compose up -d

# Ver logs
docker-compose logs -f bot

# Reiniciar
docker-compose restart

# Detener
docker-compose down
```

## Comandos útiles Docker

```bash
# Ver contenedores corriendo
docker ps

# Entrar al contenedor del bot
docker exec -it crypto-bot sh

# Ver logs del bot
docker logs -f crypto-bot

# Ver logs de la base de datos
docker logs -f crypto-db

# Reiniciar solo el bot
docker restart crypto-bot

# Parar todo
docker-compose down

# Parar y borrar volúmenes (⚠️ BORRA LA DB)
docker-compose down -v
```

## Backup de Base de Datos

```bash
# Exportar DB
docker exec crypto-db pg_dump -U bot_user crypto_escrow > backup.sql

# Importar DB
docker exec -i crypto-db psql -U bot_user crypto_escrow < backup.sql
```

## Actualizar el bot

```bash
cd /home/crypto-escrow-bot
# Subir nuevos archivos
docker-compose down
docker-compose build
docker-compose up -d
```

## ✅ Ventajas de Docker

- No necesitas instalar Node.js, PostgreSQL, ni nada en el VPS
- Todo está aislado y contenido
- Fácil de actualizar y rollback
- Portable a cualquier servidor

## 🆘 Troubleshooting

### Error: Cannot connect to Docker daemon
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### Puertos ya en uso
```bash
# Cambiar puertos en docker-compose.yml
# O ver qué está usando el puerto:
sudo lsof -i :5432
```

### Permisos de archivos
```bash
sudo chown -R $USER:$USER /home/crypto-escrow-bot
```
