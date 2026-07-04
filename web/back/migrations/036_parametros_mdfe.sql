ALTER TABLE tenant_configuracao_fiscal
  ADD COLUMN IF NOT EXISTS ambiente_mdfe VARCHAR(1) NOT NULL DEFAULT '2';

ALTER TABLE tenant_configuracao_fiscal
  ADD COLUMN IF NOT EXISTS serie_mdfe_padrao INTEGER NOT NULL DEFAULT 1;
