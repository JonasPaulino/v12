ALTER TABLE tenant_configuracao_fiscal
  ADD COLUMN IF NOT EXISTS ambiente_manifestacao_nfe VARCHAR(1) NOT NULL DEFAULT '1'
  CHECK (ambiente_manifestacao_nfe IN ('1', '2'));

UPDATE tenant_configuracao_fiscal
SET ambiente_manifestacao_nfe = '1'
WHERE ambiente_manifestacao_nfe IS NULL;
