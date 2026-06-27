CREATE TABLE IF NOT EXISTS entrada_xml_solicitacao (
  entrada_xml_solicitacao_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  chave_acesso VARCHAR(44) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'solicitada'
    CHECK (status IN (
      'solicitada',
      'consultando',
      'aguardando_sefaz',
      'xml_disponivel',
      'resumo_disponivel',
      'importada',
      'erro'
    )),
  cstat VARCHAR(10),
  xmotivo TEXT,
  resposta_raw TEXT,
  xml_disponivel TEXT,
  entrada_mercadoria_id INTEGER REFERENCES entrada_mercadoria(entrada_mercadoria_id) ON DELETE SET NULL,
  usuario_id INTEGER REFERENCES usuario(usuario_id) ON DELETE SET NULL,
  solicitado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consultado_em TIMESTAMPTZ,
  importado_em TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, chave_acesso)
);

CREATE INDEX IF NOT EXISTS idx_entrada_xml_solicitacao_status
  ON entrada_xml_solicitacao (tenant_id, status, atualizado_em DESC);

DROP TRIGGER IF EXISTS trg_entrada_xml_solicitacao_updated_at ON entrada_xml_solicitacao;
CREATE TRIGGER trg_entrada_xml_solicitacao_updated_at
BEFORE UPDATE ON entrada_xml_solicitacao
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE entrada_xml_solicitacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS entrada_xml_solicitacao_rls ON entrada_xml_solicitacao;
CREATE POLICY entrada_xml_solicitacao_rls ON entrada_xml_solicitacao
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);
