CREATE TABLE IF NOT EXISTS entrada_mercadoria (
  entrada_mercadoria_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  pedido_compra_id INTEGER REFERENCES pedido_compra(pedido_compra_id) ON DELETE SET NULL,
  pessoa_id INTEGER NOT NULL REFERENCES pessoa(pessoa_id),
  usuario_id INTEGER REFERENCES usuario(usuario_id),
  status VARCHAR(20) NOT NULL DEFAULT 'conferida'
    CHECK (status IN ('conferida', 'cancelada')),
  data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entrada_mercadoria_item (
  entrada_mercadoria_item_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  entrada_mercadoria_id INTEGER NOT NULL REFERENCES entrada_mercadoria(entrada_mercadoria_id) ON DELETE CASCADE,
  pedido_compra_item_id INTEGER REFERENCES pedido_compra_item(pedido_compra_item_id) ON DELETE SET NULL,
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_entrada_pedido_compra_ativa
  ON entrada_mercadoria (tenant_id, pedido_compra_id)
  WHERE pedido_compra_id IS NOT NULL AND status <> 'cancelada' AND excluido = FALSE;

CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_tenant
  ON entrada_mercadoria (tenant_id, excluido, data_entrada DESC);

CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_pedido
  ON entrada_mercadoria (tenant_id, pedido_compra_id);

CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_item_entrada
  ON entrada_mercadoria_item (entrada_mercadoria_id);

DROP TRIGGER IF EXISTS trg_entrada_mercadoria_updated_at ON entrada_mercadoria;
CREATE TRIGGER trg_entrada_mercadoria_updated_at
BEFORE UPDATE ON entrada_mercadoria
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_entrada_mercadoria_item_updated_at ON entrada_mercadoria_item;
CREATE TRIGGER trg_entrada_mercadoria_item_updated_at
BEFORE UPDATE ON entrada_mercadoria_item
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE entrada_mercadoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrada_mercadoria_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS entrada_mercadoria_rls ON entrada_mercadoria;
CREATE POLICY entrada_mercadoria_rls ON entrada_mercadoria
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS entrada_mercadoria_item_rls ON entrada_mercadoria_item;
CREATE POLICY entrada_mercadoria_item_rls ON entrada_mercadoria_item
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);
