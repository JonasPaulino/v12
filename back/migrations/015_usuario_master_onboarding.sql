ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS usuario_master BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE usuario
SET usuario_master = TRUE
WHERE usuario_id = 1;
