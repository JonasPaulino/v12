CREATE TABLE IF NOT EXISTS regra_tributaria_tributo (
  regra_tributaria_tributo_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  regra_tributaria_id INTEGER NOT NULL REFERENCES regra_tributaria(regra_tributaria_id) ON DELETE CASCADE,
  tipo_tributo VARCHAR(20) NOT NULL,
  cst VARCHAR(6),
  cclass_trib VARCHAR(12),
  base_calculo NUMERIC(14,4),
  aliquota NUMERIC(9,4) NOT NULL DEFAULT 0,
  aliquota_reducao NUMERIC(9,4) NOT NULL DEFAULT 0,
  valor NUMERIC(14,4) NOT NULL DEFAULT 0,
  credito_presumido NUMERIC(14,4) NOT NULL DEFAULT 0,
  diferimento NUMERIC(9,4) NOT NULL DEFAULT 0,
  observacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT regra_tributaria_tributo_tipo_chk
    CHECK (tipo_tributo IN ('CBS', 'IBS_UF', 'IBS_MUN', 'IS')),
  CONSTRAINT regra_tributaria_tributo_unique
    UNIQUE (regra_tributaria_id, tipo_tributo)
);

CREATE INDEX IF NOT EXISTS idx_regra_tributaria_tributo_tenant
  ON regra_tributaria_tributo (tenant_id, regra_tributaria_id);

DROP TRIGGER IF EXISTS trg_regra_tributaria_tributo_updated_at ON regra_tributaria_tributo;
CREATE TRIGGER trg_regra_tributaria_tributo_updated_at
BEFORE UPDATE ON regra_tributaria_tributo
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE regra_tributaria_tributo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS regra_tributaria_tributo_rls ON regra_tributaria_tributo;
CREATE POLICY regra_tributaria_tributo_rls ON regra_tributaria_tributo
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

CREATE TABLE IF NOT EXISTS fiscal.nfe_item_tributo (
  nfe_item_tributo_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  nfe_id INTEGER NOT NULL REFERENCES fiscal.nfe(nfe_id) ON DELETE CASCADE,
  nfe_item_id INTEGER NOT NULL REFERENCES fiscal.nfe_item(nfe_item_id) ON DELETE CASCADE,
  tipo_tributo VARCHAR(20) NOT NULL,
  cst VARCHAR(6),
  cclass_trib VARCHAR(12),
  base_calculo NUMERIC(14,4) NOT NULL DEFAULT 0,
  aliquota NUMERIC(9,4) NOT NULL DEFAULT 0,
  aliquota_reducao NUMERIC(9,4) NOT NULL DEFAULT 0,
  valor NUMERIC(14,4) NOT NULL DEFAULT 0,
  credito_presumido NUMERIC(14,4) NOT NULL DEFAULT 0,
  diferimento NUMERIC(9,4) NOT NULL DEFAULT 0,
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT nfe_item_tributo_tipo_chk
    CHECK (tipo_tributo IN ('CBS', 'IBS_UF', 'IBS_MUN', 'IS')),
  CONSTRAINT nfe_item_tributo_unique
    UNIQUE (nfe_item_id, tipo_tributo)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_item_tributo_nfe
  ON fiscal.nfe_item_tributo (nfe_id);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_item_tributo_tenant
  ON fiscal.nfe_item_tributo (tenant_id, nfe_item_id);

ALTER TABLE fiscal.nfe_item_tributo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fiscal_nfe_item_tributo_rls ON fiscal.nfe_item_tributo;
CREATE POLICY fiscal_nfe_item_tributo_rls ON fiscal.nfe_item_tributo
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

ALTER TABLE entrada_mercadoria
  ADD COLUMN IF NOT EXISTS manifestacao_tipo VARCHAR(40),
  ADD COLUMN IF NOT EXISTS manifestacao_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS manifestacao_protocolo VARCHAR(60),
  ADD COLUMN IF NOT EXISTS manifestacao_em TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS nfe_recebida_manifestacao (
  nfe_recebida_manifestacao_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  entrada_mercadoria_id INTEGER NOT NULL REFERENCES entrada_mercadoria(entrada_mercadoria_id) ON DELETE CASCADE,
  chave_acesso VARCHAR(44) NOT NULL,
  tipo_evento VARCHAR(40) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'registrada',
  protocolo VARCHAR(60),
  justificativa TEXT,
  resposta_raw TEXT,
  usuario_id INTEGER REFERENCES usuario(usuario_id) ON DELETE SET NULL,
  evento_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enviado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT nfe_recebida_manifestacao_tipo_chk
    CHECK (tipo_evento IN (
      'ciencia_operacao',
      'confirmacao_operacao',
      'desconhecimento_operacao',
      'operacao_nao_realizada'
    )),
  CONSTRAINT nfe_recebida_manifestacao_status_chk
    CHECK (status IN ('registrada', 'pendente_integracao', 'enviada', 'rejeitada', 'cancelada'))
);

CREATE INDEX IF NOT EXISTS idx_nfe_recebida_manifestacao_entrada
  ON nfe_recebida_manifestacao (entrada_mercadoria_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_nfe_recebida_manifestacao_tenant
  ON nfe_recebida_manifestacao (tenant_id, chave_acesso, criado_em DESC);

DROP TRIGGER IF EXISTS trg_nfe_recebida_manifestacao_updated_at ON nfe_recebida_manifestacao;
CREATE TRIGGER trg_nfe_recebida_manifestacao_updated_at
BEFORE UPDATE ON nfe_recebida_manifestacao
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE nfe_recebida_manifestacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nfe_recebida_manifestacao_rls ON nfe_recebida_manifestacao;
CREATE POLICY nfe_recebida_manifestacao_rls ON nfe_recebida_manifestacao
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);
