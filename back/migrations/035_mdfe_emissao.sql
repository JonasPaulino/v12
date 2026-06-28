ALTER TABLE tenant_configuracao_fiscal
  ADD COLUMN IF NOT EXISTS proximo_numero_mdfe INTEGER NOT NULL DEFAULT 1;

ALTER TABLE tenant_configuracao_fiscal
  ADD COLUMN IF NOT EXISTS mdfe_habilitado BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mdfe_numero_tenant_serie
  ON fiscal.mdfe (tenant_id, serie, numero)
  WHERE numero IS NOT NULL
    AND excluido = FALSE;
