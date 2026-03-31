# Estimación de costos de desarrollo — MV Services

## 1. Introducción y criterios

### Objetivo del documento

Este documento ofrece una **estimación de esfuerzo (horas)** del desarrollo del sistema MV Services, entendido como el conjunto de funcionalidades actuales: gestión de paquetes, consolidados, shippers, usuarios, roles y permisos, autenticación JWT, exportaciones PDF/Excel y etiquetas de impresión. Sirve como referencia para presupuesto del trabajo realizado o para planificar ampliaciones futuras.

### Criterios de estimación

- **Unidad**: horas de desarrollo.
- **Rol asumido**: desarrollador full-stack (backend Java/Spring Boot y frontend React).
- **Conversión a coste**: opcional. Coste estimado = Total de horas × tarifa horaria (ej. 40 €/h → rango 15 040 € – 21 440 € para 376–536 h).

### Supuestos

- Equipo de **1 desarrollador full-stack**.
- Stack ya definido: Spring Boot 4, React 19, Vite, PostgreSQL, Flyway, JWT.
- No se incluyen en esta estimación: despliegue en producción, mantenimiento post-lanzamiento, pruebas automatizadas exhaustivas (e2e/unit), ni documentación de usuario final.

---

## 2. Desglose por fase y módulo (horas)

### 2.1 Análisis y diseño (UX/UI y técnico)

| Concepto | Horas mín. | Horas máx. |
|----------|------------|------------|
| Requisitos funcionales y flujos de usuario | 12 | 20 |
| Modelo de datos y permisos por rol | 12 | 20 |
| **Subtotal Análisis y diseño** | **24** | **40** |

---

### 2.2 Backend

| Módulo / concepto | Horas mín. | Horas máx. |
|-------------------|------------|------------|
| Infraestructura (Spring Boot, JWT, CORS, variables de entorno) | 16 | 24 |
| Auth (login, registro, registro shipper, /me, roles en token) | 12 | 16 |
| Paquetes (CRUD, registro mínimo, by-guia, filtros por shipper) | 20 | 28 |
| Consolidados (CRUD, agregar/quitar paquetes, abrir/cerrar, pesos) | 20 | 28 |
| Shippers (CRUD, teléfonos, direcciones, teléfono principal) | 24 | 32 |
| Usuarios / Roles / Permisos (CRUD, asignación rol/shipper, RBAC) | 24 | 32 |
| Migraciones Flyway y ajustes de esquema | 8 | 12 |
| **Subtotal Backend** | **124** | **172** |

---

### 2.3 Frontend

| Módulo / concepto | Horas mín. | Horas máx. |
|-------------------|------------|------------|
| Infraestructura (Vite, React Router, axios, JWT, tema claro/oscuro) | 12 | 16 |
| Layout y navegación (sidebar, rutas protegidas, useMe) | 16 | 24 |
| Auth y landing (login, registro shipper, página principal) | 12 | 16 |
| Paquetes (listado, filtros, detalle, alta/edición, export PDF/Excel, diálogo descarga) | 28 | 40 |
| Consolidados (listado, crear, vista unificada, agregar paquete, diálogos, etiquetas) | 32 | 44 |
| Shippers (listado, alta/edición con teléfonos y direcciones) | 20 | 28 |
| Usuarios / Roles / Permisos (listados, altas, edición, vistas con relaciones) | 24 | 32 |
| Componentes reutilizables (tablas, formularios, combos, diálogos) | 20 | 28 |
| **Subtotal Frontend** | **176** | **248** |

---

### 2.4 Integración y pruebas

| Concepto | Horas mín. | Horas máx. |
|----------|------------|------------|
| Pruebas manuales de flujos críticos (login, paquetes, consolidados, permisos) | 16 | 24 |
| Ajustes de integración y corrección de bugs | 12 | 20 |
| **Subtotal Integración y pruebas** | **28** | **44** |

---

### 2.5 Ajustes y mejoras posteriores

| Concepto | Horas mín. | Horas máx. |
|----------|------------|------------|
| Limpieza de entidades/BD, renombrado, permisos operario, mejoras UX (descarga, filtros, etiquetas) | 24 | 40 |
| **Subtotal Ajustes** | **24** | **40** |

---

## 3. Totales y rango

| Fase | Horas mín. | Horas máx. |
|------|------------|------------|
| Análisis y diseño | 24 | 40 |
| Backend | 124 | 172 |
| Frontend | 176 | 248 |
| Integración y pruebas | 28 | 44 |
| Ajustes y mejoras | 24 | 40 |
| **TOTAL** | **376** | **544** |

- **Total estimado**: **376 – 544 horas**.
- Equivalencia aproximada (8 h/día): **47 – 68 días** de desarrollo (aprox. **2,5 – 3,5 meses** con 1 persona).
- **Coste en moneda** (ejemplo): Total horas × tarifa horaria (ej. 40 €/h → **15 040 € – 21 760 €**).

---

## 4. Supuestos y exclusiones

### Incluido en la estimación

- Desarrollo de las funcionalidades actuales del sistema.
- Autenticación y autorización (JWT, roles ADMIN, MV_ADMIN, SHIPPER, OPERARIO, permisos).
- Módulos: Paquetes, Consolidados, Shippers, Usuarios, Roles, Permisos.
- Exportación a PDF y Excel (listado de paquetes por listado actual, por fecha y por selección).
- Impresión de etiquetas (Zebra / código de barras).
- Filtros (búsqueda, fecha, shipper), diseño adaptable y modo oscuro.

### No incluido

- Despliegue en servidor de producción (hosting, DNS, SSL, CI/CD).
- Mantenimiento post-lanzamiento ni soporte continuado.
- Pruebas automatizadas exhaustivas (unitarias, integración, e2e).
- Documentación de usuario final o manual de operación.
- Nuevas funcionalidades no descritas en el alcance actual.
