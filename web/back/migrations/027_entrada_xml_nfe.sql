ALTER TABLE entrada_mercadoria
  ADD COLUMN IF NOT EXISTS chave_acesso VARCHAR(44);

ALTER TABLE entrada_mercadoria
  ADD COLUMN IF NOT EXISTS numero_nfe VARCHAR(20);

ALTER TABLE entrada_mercadoria
  ADD COLUMN IF NOT EXISTS serie_nfe VARCHAR(10);

ALTER TABLE entrada_mercadoria
  ADD COLUMN IF NOT EXISTS data_emissao_nfe DATE;

ALTER TABLE entrada_mercadoria
  ADD COLUMN IF NOT EXISTS valor_xml NUMERIC(14,2);

CREATE UNIQUE INDEX IF NOT EXISTS idx_entrada_chave_acesso_ativa
  ON entrada_mercadoria (tenant_id, chave_acesso)
  WHERE chave_acesso IS NOT NULL AND status <> 'cancelada' AND excluido = FALSE;

CREATE TABLE IF NOT EXISTS entrada_xml_importado (
  entrada_xml_importado_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  entrada_mercadoria_id INTEGER NOT NULL REFERENCES entrada_mercadoria(entrada_mercadoria_id) ON DELETE CASCADE,
  chave_acesso VARCHAR(44),
  nome_arquivo VARCHAR(180),
  conteudo_xml TEXT NOT NULL,
  importado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entrada_xml_importado_entrada
  ON entrada_xml_importado (entrada_mercadoria_id);

ALTER TABLE entrada_xml_importado ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS entrada_xml_importado_rls ON entrada_xml_importado;
CREATE POLICY entrada_xml_importado_rls ON entrada_xml_importado
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);
