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
2. Completa como mínimo:
   - `DB_PASSWORD`
   - `JWT_SECRET`
3. Opcionales:
   - `DB_URL` (default: `jdbc:postgresql://localhost:5432/mv_services_v1`)
   - `DB_USERNAME` (default: `postgres`)
   - `JWT_EXPIRATION_MS` (default: `86400000`)

La app backend arranca en el puerto `8081`.

### Frontend

1. Copia `frontend/.env.example` a `frontend/.env`.
2. Ajusta `VITE_API_URL` si tu backend no corre en `http://localhost:8081/api`.

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

## Notas

- El repositorio ignora archivos sensibles (`.env`, logs, artefactos de build).
- Flyway gestiona migraciones de base de datos desde `backend/src/main/resources/db/migration`.
