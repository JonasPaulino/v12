ALTER TABLE tenant_configuracao_fiscal
  ADD COLUMN IF NOT EXISTS ambiente_nfce VARCHAR(1) NOT NULL DEFAULT '2';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_configuracao_fiscal_ambiente_nfce_check'
  ) THEN
    ALTER TABLE tenant_configuracao_fiscal
      ADD CONSTRAINT tenant_configuracao_fiscal_ambiente_nfce_check
      CHECK (ambiente_nfce IN ('1', '2'));
  END IF;
END $$;

UPDATE tenant_configuracao_fiscal
SET ambiente_nfce = COALESCE(NULLIF(ambiente_nfe, ''), '2')
WHERE ambiente_nfce IS NULL
   OR ambiente_nfce NOT IN ('1', '2');

DROP INDEX IF EXISTS idx_tenant_configuracao_fiscal_nfce;

CREATE INDEX IF NOT EXISTS idx_tenant_configuracao_fiscal_nfce
  ON tenant_configuracao_fiscal (nfce_habilitada, ambiente_nfce, serie_nfce_padrao);
