-- Renombrar telefonos -> shippers_telefonos para claridad
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'telefonos' AND table_schema = 'public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shippers_telefonos' AND table_schema = 'public') THEN
    ALTER TABLE telefonos RENAME TO shippers_telefonos;
  END IF;
END $$;
