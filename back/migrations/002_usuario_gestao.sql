ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS usuario_primeiro_login BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS usuario_excluido BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE usuario
SET
  usuario_primeiro_login = COALESCE(usuario_primeiro_login, FALSE),
  usuario_excluido = COALESCE(usuario_excluido, FALSE);
