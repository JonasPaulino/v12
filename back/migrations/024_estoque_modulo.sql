CREATE TABLE IF NOT EXISTS estoque_tipo_movimento (
  estoque_tipo_movimento_id SERIAL PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL UNIQUE,
  descricao VARCHAR(120) NOT NULL,
  operacao VARCHAR(10) NOT NULL CHECK (operacao IN ('entrada', 'saida', 'ajuste')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO estoque_tipo_movimento (codigo, descricao, operacao)
VALUES
  ('ajuste_entrada', 'Ajuste de entrada', 'entrada'),
  ('ajuste_saida', 'Ajuste de saída', 'saida'),
  ('ajuste_saldo', 'Ajuste de saldo', 'ajuste'),
  ('venda_saida', 'Saída por venda', 'saida'),
  ('compra_entrada', 'Entrada por compra', 'entrada'),
  ('devolucao_entrada', 'Entrada por devolução', 'entrada'),
  ('devolucao_saida', 'Saída por devolução', 'saida')
ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE estoque_movimento
  ADD COLUMN IF NOT EXISTS estoque_tipo_movimento_id INTEGER REFERENCES estoque_tipo_movimento(estoque_tipo_movimento_id);

ALTER TABLE estoque_movimento
  ADD COLUMN IF NOT EXISTS saldo_anterior NUMERIC(14,4);

ALTER TABLE estoque_movimento
  ADD COLUMN IF NOT EXISTS saldo_posterior NUMERIC(14,4);

ALTER TABLE estoque_movimento
  ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuario(usuario_id);

CREATE INDEX IF NOT EXISTS idx_produto_estoque_tenant_produto
  ON produto_estoque (tenant_id, produto_id);

CREATE INDEX IF NOT EXISTS idx_estoque_movimento_tenant_data
  ON estoque_movimento (tenant_id, data_movimento DESC);

CREATE INDEX IF NOT EXISTS idx_estoque_movimento_tipo
  ON estoque_movimento (estoque_tipo_movimento_id);
