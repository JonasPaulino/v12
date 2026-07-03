-- Índices complementares para consultas fiscais feitas pelo serviço ACBr.

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_tenant_numero
  ON fiscal.nfe (tenant_id, serie, numero)
  WHERE numero IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_tenant_emitente
  ON fiscal.nfe (tenant_id, emitente_pessoa_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_tenant_destinatario
  ON fiscal.nfe (tenant_id, destinatario_pessoa_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_xml_tenant_tipo_chave
  ON fiscal.nfe_xml (tenant_id, tipo_xml, chave_acesso, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_evento_tenant_tipo_status
  ON fiscal.nfe_evento (tenant_id, tipo_evento, status, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_item_tenant_nfe
  ON fiscal.nfe_item (tenant_id, nfe_id, nfe_item_id);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_item_produto
  ON fiscal.nfe_item (tenant_id, produto_id);
