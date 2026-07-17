ALTER TABLE release_update ADD COLUMN arquivo_validado_em TEXT;
ALTER TABLE release_update ADD COLUMN arquivo_validado_sha256 TEXT;
ALTER TABLE release_update ADD COLUMN arquivo_validado_tamanho INTEGER;
