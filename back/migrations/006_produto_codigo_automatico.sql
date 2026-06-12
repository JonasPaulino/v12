ALTER TABLE produto
  ALTER COLUMN codigo_interno DROP NOT NULL;

UPDATE produto
SET codigo_interno = produto_id::VARCHAR(60)
WHERE codigo_interno IS NULL
   OR BTRIM(codigo_interno) = ''
   OR codigo_interno <> produto_id::VARCHAR(60);
