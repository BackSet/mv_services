-- Eliminar columnas no usadas de la tabla paquetes
-- Solo se mantienen: id, numero_guia, shipper_id, destinatario, peso_lbs, peso_kgs, contenido, consolidado_id

ALTER TABLE paquetes DROP COLUMN IF EXISTS estado;
ALTER TABLE paquetes DROP COLUMN IF EXISTS peso_libras;
ALTER TABLE paquetes DROP COLUMN IF EXISTS qr_token;
ALTER TABLE paquetes DROP COLUMN IF EXISTS tipo;
ALTER TABLE paquetes DROP COLUMN IF EXISTS volumen;
ALTER TABLE paquetes DROP COLUMN IF EXISTS despacho_id;
ALTER TABLE paquetes DROP COLUMN IF EXISTS destinatario_final_id;
ALTER TABLE paquetes DROP COLUMN IF EXISTS paquete_padre_id;
ALTER TABLE paquetes DROP COLUMN IF EXISTS saca_distribucion_id;
ALTER TABLE paquetes DROP COLUMN IF EXISTS alto;
ALTER TABLE paquetes DROP COLUMN IF EXISTS ancho;
ALTER TABLE paquetes DROP COLUMN IF EXISTS largo;
ALTER TABLE paquetes DROP COLUMN IF EXISTS metros_cubicos;
ALTER TABLE paquetes DROP COLUMN IF EXISTS pies_cubicos;
ALTER TABLE paquetes DROP COLUMN IF EXISTS referencia;
ALTER TABLE paquetes DROP COLUMN IF EXISTS valor;
ALTER TABLE paquetes DROP COLUMN IF EXISTS volumen_lbs;
