CREATE SCHEMA IF NOT EXISTS gestao;

ALTER TABLE gestao.financeiro_titulo
  ADD COLUMN IF NOT EXISTS asaas_installment_id VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_gestao_fin_titulo_asaas_installment
  ON gestao.financeiro_titulo (asaas_installment_id)
  WHERE asaas_installment_id IS NOT NULL;
