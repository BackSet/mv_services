-- Schema inicial para Flyway. Usa IF NOT EXISTS para compatibilidad con BDs ya creadas con ddl-auto=update.

CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS permisos (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    descripcion VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS roles_permisos (
    rol_id BIGINT NOT NULL REFERENCES roles(id),
    permiso_id BIGINT NOT NULL REFERENCES permisos(id),
    PRIMARY KEY (rol_id, permiso_id)
);

CREATE TABLE IF NOT EXISTS puntos_origen (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255),
    codigo_interno VARCHAR(255),
    nombre_encargado VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS direcciones (
    id BIGSERIAL PRIMARY KEY,
    alias VARCHAR(255),
    pais VARCHAR(255),
    provincia VARCHAR(255),
    ciudad VARCHAR(255),
    calle_principal VARCHAR(255),
    calle_secundaria VARCHAR(255),
    referencia VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS telefonos (
    id BIGSERIAL PRIMARY KEY,
    numero VARCHAR(255),
    etiqueta VARCHAR(255),
    shipper_id BIGINT REFERENCES puntos_origen(id)
);

CREATE TABLE IF NOT EXISTS shippers_direcciones (
    id BIGSERIAL PRIMARY KEY,
    shipper_id BIGINT NOT NULL REFERENCES puntos_origen(id),
    pais VARCHAR(255),
    ciudad VARCHAR(255),
    canton VARCHAR(255),
    direccion VARCHAR(255),
    referencia VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS usuarios (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    rol_id BIGINT NOT NULL REFERENCES roles(id),
    shipper_id BIGINT REFERENCES puntos_origen(id),
    activo BOOLEAN NOT NULL DEFAULT true,
    fecha_creacion TIMESTAMP,
    fecha_actualizacion TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consolidados (
    id BIGSERIAL PRIMARY KEY,
    numero_guia VARCHAR(255) UNIQUE,
    peso_total_lbs DOUBLE PRECISION,
    peso_total_kgs DOUBLE PRECISION,
    estado VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS paquetes (
    id BIGSERIAL PRIMARY KEY,
    numero_guia_interno VARCHAR(255) UNIQUE,
    punto_origen_id BIGINT REFERENCES puntos_origen(id),
    nombre_destinatario_final VARCHAR(255),
    direccion_entrega_id BIGINT REFERENCES direcciones(id),
    telefono_entrega_id BIGINT REFERENCES telefonos(id),
    peso_lbs DOUBLE PRECISION,
    peso_kgs DOUBLE PRECISION,
    descripcion_contenido VARCHAR(255),
    consolidado_id BIGINT REFERENCES consolidados(id)
);

CREATE TABLE IF NOT EXISTS historial_tracking (
    id BIGSERIAL PRIMARY KEY,
    paquete_id BIGINT NOT NULL REFERENCES paquetes(id),
    usuario_operario VARCHAR(255),
    ubicacion_actual VARCHAR(255),
    mensaje_usuario VARCHAR(255),
    fecha_hora TIMESTAMP
);
