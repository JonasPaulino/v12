CREATE TABLE IF NOT EXISTS pedido_local (
  pedido_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_erp_id INTEGER NOT NULL,
  operador_id INTEGER,
  operador_nome TEXT,
  tipo_referencia TEXT NOT NULL DEFAULT 'pedido',
  referencia TEXT NOT NULL,
  cliente_nome TEXT,
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'enviado',
  total_itens NUMERIC NOT NULL DEFAULT 0,
  total_liquido NUMERIC NOT NULL DEFAULT 0,
  importado_venda_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  enviado_em TEXT,
  importado_em TEXT,
  cancelado_em TEXT
);

CREATE TABLE IF NOT EXISTS pedido_local_item (
  pedido_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL REFERENCES pedido_local(pedido_id) ON DELETE CASCADE,
  tenant_erp_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL REFERENCES produto(produto_id),
  codigo_produto TEXT,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'UN',
  quantidade NUMERIC NOT NULL,
  valor_unitario NUMERIC NOT NULL,
  valor_total NUMERIC NOT NULL,
  observacao TEXT,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pedido_local_tenant_status
  ON pedido_local(tenant_erp_id, status, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_pedido_local_operador
  ON pedido_local(tenant_erp_id, operador_id, status, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_pedido_local_item_pedido
  ON pedido_local_item(tenant_erp_id, pedido_id);
