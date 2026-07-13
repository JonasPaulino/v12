ALTER TABLE produto ADD COLUMN descricao_fiscal TEXT;
ALTER TABLE produto ADD COLUMN gtin TEXT;
ALTER TABLE produto ADD COLUMN origem_mercadoria TEXT;
ALTER TABLE produto ADD COLUMN regra_tributaria_erp_id INTEGER;
ALTER TABLE produto ADD COLUMN regra_fiscal_descricao TEXT;
ALTER TABLE produto ADD COLUMN crt_emitente TEXT;
ALTER TABLE produto ADD COLUMN cbenef TEXT;
ALTER TABLE produto ADD COLUMN cfop_venda_interna TEXT;
ALTER TABLE produto ADD COLUMN cfop_venda_interestadual TEXT;
ALTER TABLE produto ADD COLUMN icms_cst TEXT;
ALTER TABLE produto ADD COLUMN icms_csosn TEXT;
ALTER TABLE produto ADD COLUMN icms_aliquota NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE produto ADD COLUMN icms_reducao_base NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE produto ADD COLUMN icms_aliquota_fcp NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE produto ADD COLUMN icms_modalidade_bc TEXT;
ALTER TABLE produto ADD COLUMN pis_cst TEXT;
ALTER TABLE produto ADD COLUMN pis_aliquota NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE produto ADD COLUMN cofins_cst TEXT;
ALTER TABLE produto ADD COLUMN cofins_aliquota NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE produto ADD COLUMN ipi_cst TEXT;
ALTER TABLE produto ADD COLUMN ipi_enquadramento TEXT;
ALTER TABLE produto ADD COLUMN ipi_aliquota NUMERIC NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_produto_tenant_regra_fiscal
  ON produto(tenant_erp_id, regra_tributaria_erp_id);
