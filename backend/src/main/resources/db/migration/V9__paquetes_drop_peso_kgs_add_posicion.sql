-- =====================================================================
-- V9: Eliminar peso en kgs (queda derivado en backend desde lbs)
--     y agregar la posición del paquete dentro del consolidado.
-- =====================================================================

-- 1) Asegurar que todo paquete con sólo kgs registrado conserve un peso
--    en libras consistente antes de borrar la columna.
UPDATE paquetes
SET peso_lbs = peso_kgs * 2.2046226218
WHERE peso_lbs IS NULL
  AND peso_kgs IS NOT NULL;

-- 2) Eliminar columna pesoKgs de paquetes y de consolidados.
ALTER TABLE paquetes
    DROP COLUMN IF EXISTS peso_kgs;

ALTER TABLE consolidados
    DROP COLUMN IF EXISTS peso_total_kgs;

-- 3) Agregar columna posicion_en_consolidado.
ALTER TABLE paquetes
    ADD COLUMN IF NOT EXISTS posicion_en_consolidado INTEGER;

-- 4) Inicializar posiciones para los paquetes ya consolidados,
--    ordenándolos por id ascendente (estable).
WITH ordenado AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY consolidado_id ORDER BY id) AS rn
    FROM paquetes
    WHERE consolidado_id IS NOT NULL
)
UPDATE paquetes p
SET posicion_en_consolidado = o.rn
FROM ordenado o
WHERE p.id = o.id;

-- 5) Índice para consultas y ordenamiento por posición dentro del consolidado.
CREATE INDEX IF NOT EXISTS idx_paquetes_consolidado_posicion
    ON paquetes (consolidado_id, posicion_en_consolidado);
