# Baseline de Contrato API y Migracion

## Objetivo
Definir el contrato actual entre backend y frontend, y el contrato objetivo de refactor para ejecutar cambios de endpoints/payloads con adaptacion inmediata en frontend.

## Contrato actual por dominio

### Auth
- `POST /api/auth/login` -> `{ token }` en exito; errores especiales con `code` para solicitudes shipper.
- `GET /api/auth/me` -> `{ username, email, rol, permisos[], shipperId, shipperNombre }`.
- `PUT /api/auth/me`, `PUT /api/auth/me/password`, `PUT /api/auth/me/shipper`.
- `POST /api/auth/register-shipper`.

### Usuarios
- CRUD en `/api/usuarios`.
- `GET /api/usuarios/by-shipper/{shipperId}`.

### Shippers
- CRUD en `/api/shippers`.
- Telefonos y direcciones anidados:
  - `POST/PUT/DELETE /api/shippers/{id}/telefonos...`
  - `POST/PUT/DELETE /api/shippers/{id}/direcciones...`

### Paquetes
- CRUD en `/api/paquetes`.
- `POST /api/paquetes/registro-minimo`.
- `GET /api/paquetes/by-guia?numeroGuia=...`.

### Consolidados
- CRUD base en `/api/consolidados`.
- Operaciones de relacion:
  - `POST /api/consolidados/{id}/paquetes/{paqueteId}`
  - `DELETE /api/consolidados/{id}/paquetes/{paqueteId}`
- Estado:
  - `PUT /api/consolidados/{id}/abrir`
  - `PUT /api/consolidados/{id}/cerrar`

### Roles y permisos
- CRUD en `/api/roles` y `/api/permisos`.

### Solicitudes de shipper
- `GET /api/shipper-solicitudes?estado=...`
- `GET /api/shipper-solicitudes/count?estado=PENDIENTE`
- `POST /api/shipper-solicitudes/{id}/aprobar`
- `POST /api/shipper-solicitudes/{id}/rechazar`

## Contrato objetivo de refactor

## 1) Estandar de errores
Todas las respuestas de error seguiran estructura JSON uniforme:
- `timestamp`
- `status`
- `error`
- `message`
- `path`
- `code` (opcional para errores de dominio)

## 2) Seguridad de serializacion
- No exponer `password` de `Usuario`.
- No exponer `passwordHash` de `ShipperSolicitud`.

## 3) Validacion de entrada
- Requests de auth/registro/login con Bean Validation.
- Endpoints con `@Valid` donde aplique.

## 4) Estandar HTTP
- `DELETE` -> `204 No Content` de forma consistente.
- `400/404/409` con JSON uniforme de error.

## 5) Compatibilidad frontend
- Mantener los paths principales para reducir ruptura.
- Si cambia payload, adaptar en `frontend/src/services/*` con normalizadores.
- Centralizar auth client-side para desacoplar hooks/paginas del wire-format.

## Tabla de migracion (primera iteracion)

| Area | Endpoint actual | Endpoint objetivo | Impacto frontend |
|---|---|---|---|
| Auth | `/api/auth/*` | Se mantiene | Bajo, solo normalizacion de respuestas/errores |
| Usuarios | `/api/usuarios/*` | Se mantiene | Bajo, sin cambio de rutas |
| Shippers | `/api/shippers/*` | Se mantiene | Bajo, mejora en carga/serializacion |
| Paquetes | `/api/paquetes/*` | Se mantiene | Bajo, mejora en validacion/errores |
| Consolidados | `/api/consolidados/*` | Se mantiene | Bajo, unificacion de codigos de respuesta |
| Roles/Permisos | `/api/roles/*`, `/api/permisos/*` | Se mantiene | Bajo |
| Solicitudes | `/api/shipper-solicitudes/*` | Se mantiene | Bajo, evitar fuga de password hash |

## Riesgos
- Cambios en estructura de error pueden afectar mensajes UI.
- Cambios en serializacion pueden afectar tablas si dependian de campos sensibles (no deberia ocurrir).
- Cambios de status code en `DELETE` requieren confirmar que frontend no dependa de body.

## Mitigacion
- Adaptar servicios frontend en una capa unica por dominio.
- Ejecutar typecheck/lint/build frontend y pruebas de backend tras cada bloque de cambios.
- Validar flujos criticos: login, perfil, CRUD core, consolidados, solicitudes shipper.

