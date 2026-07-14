ALTER TABLE nfce ADD COLUMN ambiente TEXT;
ALTER TABLE nfce ADD COLUMN recibo TEXT;
ALTER TABLE nfce ADD COLUMN cstat TEXT;
ALTER TABLE nfce ADD COLUMN xml_assinado TEXT;
ALTER TABLE nfce ADD COLUMN xml_retorno TEXT;
ALTER TABLE nfce ADD COLUMN raw_retorno TEXT;
ALTER TABLE nfce ADD COLUMN pdf_path TEXT;
ALTER TABLE nfce ADD COLUMN lote INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_nfce_tenant_status_numero
  ON nfce(tenant_erp_id, status, numero DESC);

CREATE INDEX IF NOT EXISTS idx_nfce_tenant_chave
  ON nfce(tenant_erp_id, chave_acesso);
