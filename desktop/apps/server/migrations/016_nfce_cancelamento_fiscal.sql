ALTER TABLE nfce ADD COLUMN cancelamento_protocolo TEXT;
ALTER TABLE nfce ADD COLUMN cancelamento_cstat TEXT;
ALTER TABLE nfce ADD COLUMN cancelamento_motivo TEXT;
ALTER TABLE nfce ADD COLUMN cancelamento_xml TEXT;
ALTER TABLE nfce ADD COLUMN cancelamento_raw_retorno TEXT;
ALTER TABLE nfce ADD COLUMN cancelada_em TEXT;

CREATE INDEX IF NOT EXISTS idx_nfce_tenant_cancelada_em
  ON nfce(tenant_erp_id, cancelada_em);
