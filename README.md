# mv_services

Aplicación full stack para gestión logística de paquetes.

## Estructura del proyecto

- `backend`: API REST con Spring Boot, seguridad JWT, JPA y Flyway.
- `frontend`: SPA en React + TypeScript + Vite.
- `docs`: documentación funcional y técnica.

## Requisitos

- Java 25
- Maven 3.9+
- Node.js 20+ y npm
- PostgreSQL 14+

## Configuración de entorno

### Backend

1. Copia `backend/.env.example` a `backend/.env`.
2. Variables recomendadas en `.env`:
   - `SPRING_PROFILES_ACTIVE=dev`
   - `SERVER_PORT=8081`
3. Completa como mínimo:
   - `DB_PASSWORD`
   - `JWT_SECRET`
4. Opcionales:
   - `DB_URL` (default: `jdbc:postgresql://localhost:5432/mv_services_v1`)
   - `DB_USERNAME` (default: `postgres`)
   - `JWT_EXPIRATION_MS` (default: `86400000`)

La app backend arranca en el puerto `8081`.

### Frontend

1. Copia `frontend/.env.example` a `frontend/.env`.
2. Define `VITE_API_URL` (obligatoria). Ejemplo: `http://localhost:8081/api`.
3. El frontend valida esta variable al iniciar; si falta, falla para evitar configuraciones incorrectas.

## Ejecución local

### 1) Backend

```bash
cd backend
mvn spring-boot:run
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend por defecto: `http://localhost:5173`.

## Scripts útiles (frontend)

- `npm run dev`: entorno de desarrollo
- `npm run build`: build de producción
- `npm run preview`: previsualizar build
- `npm run lint`: ejecutar ESLint

## Despliegue en Railway (Docker)

Este repositorio está preparado para desplegar **2 servicios** en el mismo proyecto de Railway:

- `backend` (Spring Boot)
- `frontend` (Vite compilado + Nginx)

### Archivos de despliegue

- `backend/Dockerfile`
- `backend/railway.toml`
- `frontend/Dockerfile`
- `frontend/nginx.conf.template`
- `frontend/railway.toml`

### Pasos en Railway

1. Crea un proyecto nuevo en Railway.
2. Crea el servicio **backend** apuntando al directorio raíz `backend`.
3. Crea el servicio **frontend** apuntando al directorio raíz `frontend`.
4. Railway usará el `railway.toml` y Dockerfile de cada servicio.

### Variables de entorno en Railway

#### Backend

- `SPRING_PROFILES_ACTIVE=prod`
- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRATION_MS` (opcional)
- `CORS_ALLOWED_ORIGINS` (CSV), por ejemplo:
  - `https://tu-frontend.up.railway.app`
  - o múltiples: `https://tu-frontend.up.railway.app,http://localhost:5173`

Notas:
- `PORT` lo inyecta Railway automáticamente.
- `application.properties` prioriza `PORT` con fallback local.

#### Frontend

- `VITE_API_URL` (obligatoria), apuntando a la URL pública del backend en Railway.
- `PORT` lo inyecta Railway automáticamente.

Nota:
- `VITE_API_URL` se usa en build de Vite dentro del Dockerfile.

## Notas

- El repositorio ignora archivos sensibles (`.env`, logs, artefactos de build).
- Flyway gestiona migraciones de base de datos desde `backend/src/main/resources/db/migration`.
- El seed de usuarios por defecto mantiene solo `admin` y `operario`.
