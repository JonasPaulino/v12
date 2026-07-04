DO $$
DECLARE
  duplicate_count integer;
  missing_email_count integer;
BEGIN
  SELECT COUNT(*)
    INTO missing_email_count
  FROM usuario
  WHERE usuario_excluido = FALSE
    AND COALESCE(TRIM(usuario_email), '') = '';

  IF missing_email_count > 0 THEN
    RAISE EXCEPTION 'Existem usuários ativos sem e-mail. Corrija antes de aplicar login global por e-mail.';
  END IF;

  SELECT COUNT(*)
    INTO duplicate_count
  FROM (
    SELECT LOWER(TRIM(usuario_email)) AS email_normalizado
    FROM usuario
    WHERE usuario_excluido = FALSE
      AND COALESCE(TRIM(usuario_email), '') <> ''
    GROUP BY LOWER(TRIM(usuario_email))
    HAVING COUNT(*) > 1
  ) duplicated;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Existem e-mails duplicados em usuario. Corrija antes de aplicar login global por e-mail.';
  END IF;
END $$;

ALTER TABLE usuario
  ALTER COLUMN usuario_username TYPE VARCHAR(150);

ALTER TABLE usuario
  DROP CONSTRAINT IF EXISTS usuario_usuario_username_key;

UPDATE usuario
SET
  usuario_email = LOWER(TRIM(usuario_email)),
  usuario_username = LOWER(TRIM(usuario_email)),
  atualizado_em = NOW()
WHERE usuario_excluido = FALSE
  AND COALESCE(TRIM(usuario_email), '') <> ''
  AND (
    usuario_email <> LOWER(TRIM(usuario_email))
    OR usuario_username IS DISTINCT FROM LOWER(TRIM(usuario_email))
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_email_global_lower_ativo
  ON usuario (LOWER(TRIM(usuario_email)))
  WHERE usuario_excluido = FALSE;
