-- Añadir fecha de registro para filtros y exportación
ALTER TABLE paquetes ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMP;

-- Rellenar registros existentes con la fecha actual para no dejar NULLs
UPDATE paquetes SET fecha_registro = NOW() WHERE fecha_registro IS NULL;
