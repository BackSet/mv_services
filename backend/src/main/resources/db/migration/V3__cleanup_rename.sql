-- Eliminar columnas huerfanas de paquetes
ALTER TABLE paquetes DROP COLUMN IF EXISTS direccion_entrega_id;
ALTER TABLE paquetes DROP COLUMN IF EXISTS telefono_entrega_id;

-- Eliminar tablas no usadas
DROP TABLE IF EXISTS direcciones;
DROP TABLE IF EXISTS historial_tracking;

-- Renombrar tabla puntos_origen -> shippers (si aun existe con el nombre viejo)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'puntos_origen' AND table_schema = 'public') THEN
    ALTER TABLE puntos_origen RENAME TO shippers;
  END IF;
END $$;

-- Renombrar columnas de paquetes: solo si la columna vieja existe y la nueva NO existe
DO $$
BEGIN
  -- punto_origen_id -> shipper_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paquetes' AND column_name='punto_origen_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paquetes' AND column_name='shipper_id') THEN
    ALTER TABLE paquetes RENAME COLUMN punto_origen_id TO shipper_id;
  END IF;

  -- Si ambas existen (creada por Hibernate), eliminar la vieja vacia y mantener la nueva
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paquetes' AND column_name='punto_origen_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paquetes' AND column_name='shipper_id') THEN
    -- Copiar datos de la vieja a la nueva donde la nueva sea null
    UPDATE paquetes SET shipper_id = punto_origen_id WHERE shipper_id IS NULL AND punto_origen_id IS NOT NULL;
    ALTER TABLE paquetes DROP COLUMN punto_origen_id;
  END IF;

  -- numero_guia_interno -> numero_guia
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paquetes' AND column_name='numero_guia_interno')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paquetes' AND column_name='numero_guia') THEN
    ALTER TABLE paquetes RENAME COLUMN numero_guia_interno TO numero_guia;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paquetes' AND column_name='numero_guia_interno')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paquetes' AND column_name='numero_guia') THEN
    UPDATE paquetes SET numero_guia = numero_guia_interno WHERE numero_guia IS NULL AND numero_guia_interno IS NOT NULL;
    ALTER TABLE paquetes DROP COLUMN numero_guia_interno;
  END IF;

  -- nombre_destinatario_final -> destinatario
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paquetes' AND column_name='nombre_destinatario_final')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paquetes' AND column_name='destinatario') THEN
    ALTER TABLE paquetes RENAME COLUMN nombre_destinatario_final TO destinatario;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paquetes' AND column_name='nombre_destinatario_final')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paquetes' AND column_name='destinatario') THEN
    UPDATE paquetes SET destinatario = nombre_destinatario_final WHERE destinatario IS NULL AND nombre_destinatario_final IS NOT NULL;
    ALTER TABLE paquetes DROP COLUMN nombre_destinatario_final;
  END IF;

  -- descripcion_contenido -> contenido
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paquetes' AND column_name='descripcion_contenido')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paquetes' AND column_name='contenido') THEN
    ALTER TABLE paquetes RENAME COLUMN descripcion_contenido TO contenido;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paquetes' AND column_name='descripcion_contenido')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paquetes' AND column_name='contenido') THEN
    UPDATE paquetes SET contenido = descripcion_contenido WHERE contenido IS NULL AND descripcion_contenido IS NOT NULL;
    ALTER TABLE paquetes DROP COLUMN descripcion_contenido;
  END IF;
END $$;
