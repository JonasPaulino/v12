CREATE TABLE IF NOT EXISTS nfe_distribuicao_controle (
  nfe_distribuicao_controle_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  ambiente VARCHAR(1) NOT NULL DEFAULT '2',
  documento VARCHAR(14) NOT NULL,
  uf VARCHAR(2) NOT NULL,
  ult_nsu VARCHAR(15) NOT NULL DEFAULT '000000000000000',
  max_nsu VARCHAR(15) NOT NULL DEFAULT '000000000000000',
  cstat VARCHAR(3),
  xmotivo TEXT,
  ultima_consulta_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, ambiente, documento)
);

CREATE TABLE IF NOT EXISTS nfe_recebida_distribuicao (
  nfe_recebida_distribuicao_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  chave_acesso VARCHAR(44) NOT NULL,
  nsu VARCHAR(15),
  schema_tipo VARCHAR(80),
  tipo_documento VARCHAR(20) NOT NULL DEFAULT 'resumo',
  status_manifestacao VARCHAR(40) NOT NULL DEFAULT 'pendente',
  status_xml VARCHAR(30) NOT NULL DEFAULT 'resumo',
  emitente_documento VARCHAR(14),
  emitente_nome TEXT,
  emitente_ie VARCHAR(30),
  destinatario_documento VARCHAR(14),
  numero_nfe VARCHAR(20),
  serie_nfe VARCHAR(10),
  data_emissao TIMESTAMPTZ,
  valor_total NUMERIC(15,2),
  xml_resumo TEXT,
  xml_completo TEXT,
  resposta_raw TEXT,
  entrada_mercadoria_id INTEGER REFERENCES entrada_mercadoria(entrada_mercadoria_id),
  descoberta_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, chave_acesso)
);

CREATE TABLE IF NOT EXISTS nfe_recebida_evento (
  nfe_recebida_evento_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  nfe_recebida_distribuicao_id INTEGER NOT NULL REFERENCES nfe_recebida_distribuicao(nfe_recebida_distribuicao_id) ON DELETE CASCADE,
  chave_acesso VARCHAR(44) NOT NULL,
  tipo_evento VARCHAR(40) NOT NULL,
  codigo_evento VARCHAR(6) NOT NULL,
  justificativa TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  cstat VARCHAR(3),
  xmotivo TEXT,
  protocolo VARCHAR(80),
  resposta_raw TEXT,
  usuario_id INTEGER REFERENCES usuario(usuario_id),
  enviado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notificacao (
  notificacao_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuario(usuario_id),
  tipo VARCHAR(60) NOT NULL,
  titulo VARCHAR(160) NOT NULL,
  mensagem TEXT,
  rota VARCHAR(200),
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  lida_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nfe_distribuicao_controle_tenant
  ON nfe_distribuicao_controle (tenant_id, ambiente);

CREATE INDEX IF NOT EXISTS idx_nfe_recebida_distribuicao_tenant
  ON nfe_recebida_distribuicao (tenant_id, status_manifestacao, atualizado_em DESC);

CREATE INDEX IF NOT EXISTS idx_nfe_recebida_distribuicao_chave
  ON nfe_recebida_distribuicao (tenant_id, chave_acesso);

CREATE INDEX IF NOT EXISTS idx_nfe_recebida_evento_nfe
  ON nfe_recebida_evento (tenant_id, nfe_recebida_distribuicao_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_notificacao_tenant_lida
  ON notificacao (tenant_id, lida, criado_em DESC);

DROP TRIGGER IF EXISTS trg_nfe_distribuicao_controle_updated_at ON nfe_distribuicao_controle;
CREATE TRIGGER trg_nfe_distribuicao_controle_updated_at
BEFORE UPDATE ON nfe_distribuicao_controle
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_nfe_recebida_distribuicao_updated_at ON nfe_recebida_distribuicao;
CREATE TRIGGER trg_nfe_recebida_distribuicao_updated_at
BEFORE UPDATE ON nfe_recebida_distribuicao
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_nfe_recebida_evento_updated_at ON nfe_recebida_evento;
CREATE TRIGGER trg_nfe_recebida_evento_updated_at
BEFORE UPDATE ON nfe_recebida_evento
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE nfe_distribuicao_controle ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_recebida_distribuicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_recebida_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nfe_distribuicao_controle_rls ON nfe_distribuicao_controle;
CREATE POLICY nfe_distribuicao_controle_rls ON nfe_distribuicao_controle
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS nfe_recebida_distribuicao_rls ON nfe_recebida_distribuicao;
CREATE POLICY nfe_recebida_distribuicao_rls ON nfe_recebida_distribuicao
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS nfe_recebida_evento_rls ON nfe_recebida_evento;
CREATE POLICY nfe_recebida_evento_rls ON nfe_recebida_evento
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS notificacao_rls ON notificacao;
CREATE POLICY notificacao_rls ON notificacao
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);
