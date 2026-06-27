CREATE TABLE IF NOT EXISTS pedido_compra (
  pedido_compra_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  pessoa_id INTEGER NOT NULL REFERENCES pessoa(pessoa_id),
  usuario_id INTEGER REFERENCES usuario(usuario_id),
  financeiro_condicao_pagamento_id INTEGER REFERENCES financeiro_condicao_pagamento(financeiro_condicao_pagamento_id),
  status VARCHAR(20) NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'recebido', 'cancelado')),
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_previsao DATE,
  observacao TEXT,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
  acrescimo NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedido_compra_item (
  pedido_compra_item_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  pedido_compra_id INTEGER NOT NULL REFERENCES pedido_compra(pedido_compra_id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produto(produto_id),
  codigo_interno VARCHAR(60) NOT NULL,
  descricao VARCHAR(180) NOT NULL,
  unidade_sigla VARCHAR(10),
  quantidade NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_unitario NUMERIC(14,4) NOT NULL DEFAULT 0,
  desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
  acrescimo NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE financeiro_titulo
  ADD COLUMN IF NOT EXISTS pedido_compra_id INTEGER REFERENCES pedido_compra(pedido_compra_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pedido_compra_tenant
  ON pedido_compra (tenant_id, excluido, data_emissao DESC);

CREATE INDEX IF NOT EXISTS idx_pedido_compra_pessoa
  ON pedido_compra (tenant_id, pessoa_id, excluido);

CREATE INDEX IF NOT EXISTS idx_pedido_compra_item_pedido
  ON pedido_compra_item (pedido_compra_id);

CREATE INDEX IF NOT EXISTS idx_fin_titulo_pedido_compra
  ON financeiro_titulo (pedido_compra_id);

DROP TRIGGER IF EXISTS trg_pedido_compra_updated_at ON pedido_compra;
CREATE TRIGGER trg_pedido_compra_updated_at
BEFORE UPDATE ON pedido_compra
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_pedido_compra_item_updated_at ON pedido_compra_item;
CREATE TRIGGER trg_pedido_compra_item_updated_at
BEFORE UPDATE ON pedido_compra_item
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE pedido_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_compra_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pedido_compra_rls ON pedido_compra;
CREATE POLICY pedido_compra_rls ON pedido_compra
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS pedido_compra_item_rls ON pedido_compra_item;
CREATE POLICY pedido_compra_item_rls ON pedido_compra_item
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);
