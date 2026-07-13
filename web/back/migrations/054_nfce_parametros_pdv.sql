ALTER TABLE tenant_configuracao_fiscal
  ADD COLUMN IF NOT EXISTS nfce_habilitada BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE tenant_configuracao_fiscal
  ADD COLUMN IF NOT EXISTS serie_nfce_padrao INTEGER NOT NULL DEFAULT 1;

ALTER TABLE tenant_configuracao_fiscal
  ADD COLUMN IF NOT EXISTS proximo_numero_nfce INTEGER NOT NULL DEFAULT 1;

ALTER TABLE tenant_configuracao_fiscal
  ADD COLUMN IF NOT EXISTS nfce_id_token_csc VARCHAR(6);

ALTER TABLE tenant_configuracao_fiscal
  ADD COLUMN IF NOT EXISTS nfce_csc_criptografado TEXT;

ALTER TABLE tenant_configuracao_fiscal
  ADD COLUMN IF NOT EXISTS nfce_csc_masked VARCHAR(80);

ALTER TABLE tenant_configuracao_fiscal
  ADD COLUMN IF NOT EXISTS nfce_ind_pres_padrao VARCHAR(1) NOT NULL DEFAULT '1';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_configuracao_fiscal_nfce_ind_pres_padrao_check'
  ) THEN
    ALTER TABLE tenant_configuracao_fiscal
      ADD CONSTRAINT tenant_configuracao_fiscal_nfce_ind_pres_padrao_check
      CHECK (nfce_ind_pres_padrao IN ('0', '1', '2', '3', '4', '5', '9'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenant_configuracao_fiscal_nfce
  ON tenant_configuracao_fiscal (nfce_habilitada, ambiente_nfe, serie_nfce_padrao);
