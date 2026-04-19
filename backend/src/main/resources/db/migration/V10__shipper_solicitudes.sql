-- Tabla de solicitudes de registro de shippers (flujo de aprobación por operario).

CREATE TABLE IF NOT EXISTS shipper_solicitudes (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    shipper_nombre VARCHAR(255) NOT NULL,
    codigo_interno VARCHAR(255),
    nombre_encargado VARCHAR(255),
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    motivo_rechazo VARCHAR(500),
    fecha_solicitud TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMP,
    resuelta_por_usuario_id BIGINT,
    shipper_creado_id BIGINT,
    usuario_creado_id BIGINT
);

CREATE INDEX IF NOT EXISTS idx_shipper_solicitudes_estado ON shipper_solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_shipper_solicitudes_username ON shipper_solicitudes(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_shipper_solicitudes_email ON shipper_solicitudes(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_shipper_solicitudes_fecha ON shipper_solicitudes(fecha_solicitud DESC);

-- Permiso nuevo y asignación a roles operativos.
INSERT INTO permisos(nombre, descripcion)
SELECT 'shippers.aprobar', 'Aprobar/rechazar solicitudes de registro de shippers'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'shippers.aprobar');

INSERT INTO roles_permisos(rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre IN ('OPERARIO', 'ADMIN', 'MV_ADMIN')
  AND p.nombre = 'shippers.aprobar'
  AND NOT EXISTS (
      SELECT 1 FROM roles_permisos rp
      WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
  );
