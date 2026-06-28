CREATE TABLE IF NOT EXISTS devolucao_mercadoria (
  devolucao_mercadoria_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  operacao_fiscal_id INTEGER REFERENCES operacao_fiscal(operacao_fiscal_id) ON DELETE SET NULL,
  pedido_venda_id INTEGER REFERENCES pedido_venda(pedido_venda_id) ON DELETE SET NULL,
  entrada_mercadoria_id INTEGER REFERENCES entrada_mercadoria(entrada_mercadoria_id) ON DELETE SET NULL,
  pessoa_id INTEGER NOT NULL REFERENCES pessoa(pessoa_id),
  usuario_id INTEGER REFERENCES usuario(usuario_id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('venda', 'compra')),
  status VARCHAR(20) NOT NULL DEFAULT 'registrada'
    CHECK (status IN ('registrada', 'cancelada')),
  data_devolucao DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo VARCHAR(180),
  observacao TEXT,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT devolucao_origem_chk CHECK (
    (tipo = 'venda' AND pedido_venda_id IS NOT NULL AND entrada_mercadoria_id IS NULL)
    OR
    (tipo = 'compra' AND entrada_mercadoria_id IS NOT NULL AND pedido_venda_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS devolucao_mercadoria_item (
  devolucao_mercadoria_item_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  devolucao_mercadoria_id INTEGER NOT NULL REFERENCES devolucao_mercadoria(devolucao_mercadoria_id) ON DELETE CASCADE,
  pedido_venda_item_id INTEGER REFERENCES pedido_venda_item(pedido_venda_item_id) ON DELETE SET NULL,
  entrada_mercadoria_item_id INTEGER REFERENCES entrada_mercadoria_item(entrada_mercadoria_item_id) ON DELETE SET NULL,
  produto_id INTEGER NOT NULL REFERENCES produto(produto_id),
  codigo_interno VARCHAR(60) NOT NULL,
  descricao VARCHAR(180) NOT NULL,
  unidade_sigla VARCHAR(10),
  quantidade NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_unitario NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devolucao_mercadoria_tenant
  ON devolucao_mercadoria (tenant_id, excluido, data_devolucao DESC);

CREATE INDEX IF NOT EXISTS idx_devolucao_mercadoria_pedido_venda
  ON devolucao_mercadoria (tenant_id, pedido_venda_id)
  WHERE pedido_venda_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_devolucao_mercadoria_entrada
  ON devolucao_mercadoria (tenant_id, entrada_mercadoria_id)
  WHERE entrada_mercadoria_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_devolucao_item_devolucao
  ON devolucao_mercadoria_item (devolucao_mercadoria_id);

DROP TRIGGER IF EXISTS trg_devolucao_mercadoria_updated_at ON devolucao_mercadoria;
CREATE TRIGGER trg_devolucao_mercadoria_updated_at
BEFORE UPDATE ON devolucao_mercadoria
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_devolucao_mercadoria_item_updated_at ON devolucao_mercadoria_item;
CREATE TRIGGER trg_devolucao_mercadoria_item_updated_at
BEFORE UPDATE ON devolucao_mercadoria_item
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE devolucao_mercadoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE devolucao_mercadoria_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS devolucao_mercadoria_rls ON devolucao_mercadoria;
CREATE POLICY devolucao_mercadoria_rls ON devolucao_mercadoria
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS devolucao_mercadoria_item_rls ON devolucao_mercadoria_item;
CREATE POLICY devolucao_mercadoria_item_rls ON devolucao_mercadoria_item
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);
