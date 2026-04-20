-- Consolidación de roles del sistema a tres canónicos: ADMIN, OPERARIO, SHIPPER.
-- Migra usuarios con roles legacy (MV_ADMIN, DESTINATARIO_FINAL), agrega permisos
-- shippers.* y reconstruye el mapa roles_permisos para el nuevo modelo.

-- 1) Permisos nuevos para gestión granular de shippers.
INSERT INTO permisos(nombre, descripcion)
SELECT 'shippers.read', 'Ver shippers'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'shippers.read');

INSERT INTO permisos(nombre, descripcion)
SELECT 'shippers.create', 'Crear shippers'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'shippers.create');

INSERT INTO permisos(nombre, descripcion)
SELECT 'shippers.update', 'Actualizar shippers (datos, teléfonos, direcciones)'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'shippers.update');

INSERT INTO permisos(nombre, descripcion)
SELECT 'shippers.delete', 'Eliminar shippers'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'shippers.delete');

-- 2) Asegurar que existen los tres roles canónicos antes de migrar usuarios.
INSERT INTO roles(nombre)
SELECT 'ADMIN' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'ADMIN');

INSERT INTO roles(nombre)
SELECT 'OPERARIO' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'OPERARIO');

INSERT INTO roles(nombre)
SELECT 'SHIPPER' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'SHIPPER');

-- 3) Migrar usuarios legacy a los roles equivalentes del nuevo modelo.
UPDATE usuarios
SET rol_id = (SELECT id FROM roles WHERE nombre = 'OPERARIO')
WHERE rol_id IN (SELECT id FROM roles WHERE nombre = 'MV_ADMIN');

UPDATE usuarios
SET rol_id = (SELECT id FROM roles WHERE nombre = 'SHIPPER')
WHERE rol_id IN (SELECT id FROM roles WHERE nombre = 'DESTINATARIO_FINAL');

-- 4) Eliminar asignaciones de permisos de los roles legacy y luego los propios roles.
DELETE FROM roles_permisos
WHERE rol_id IN (SELECT id FROM roles WHERE nombre IN ('MV_ADMIN', 'DESTINATARIO_FINAL'));

DELETE FROM roles WHERE nombre IN ('MV_ADMIN', 'DESTINATARIO_FINAL');

-- 5) Reseed completo de roles_permisos para los tres roles canónicos.
DELETE FROM roles_permisos
WHERE rol_id IN (SELECT id FROM roles WHERE nombre IN ('ADMIN', 'OPERARIO', 'SHIPPER'));

-- ADMIN: todos los permisos existentes en el sistema.
INSERT INTO roles_permisos(rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'ADMIN';

-- OPERARIO: paquetes.*, consolidados.*, shippers.* (incluyendo aprobar).
INSERT INTO roles_permisos(rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'OPERARIO'
  AND p.nombre IN (
      'paquetes.read', 'paquetes.create_minimo', 'paquetes.update', 'paquetes.delete',
      'consolidados.read', 'consolidados.create', 'consolidados.add_paquete',
      'consolidados.cerrar', 'consolidados.delete',
      'shippers.read', 'shippers.create', 'shippers.update', 'shippers.delete',
      'shippers.aprobar'
  );

-- SHIPPER: solo gestión de sus propios paquetes (filtrado en el backend por shipperId).
INSERT INTO roles_permisos(rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'SHIPPER'
  AND p.nombre IN (
      'paquetes.read',
      'paquetes.create_minimo',
      'paquetes.update'
  );
