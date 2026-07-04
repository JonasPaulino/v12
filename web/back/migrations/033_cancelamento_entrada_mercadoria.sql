ALTER TABLE entrada_mercadoria
  ADD COLUMN IF NOT EXISTS cancelado_por INTEGER REFERENCES usuario(usuario_id) ON DELETE SET NULL;

ALTER TABLE entrada_mercadoria
  ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMPTZ;

ALTER TABLE entrada_mercadoria
  ADD COLUMN IF NOT EXISTS cancelamento_motivo TEXT;

ALTER TABLE financeiro_titulo
  ADD COLUMN IF NOT EXISTS cancelado_por INTEGER REFERENCES usuario(usuario_id) ON DELETE SET NULL;

ALTER TABLE financeiro_titulo
  ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMPTZ;

ALTER TABLE financeiro_titulo
  ADD COLUMN IF NOT EXISTS cancelamento_motivo TEXT;

INSERT INTO estoque_tipo_movimento (codigo, descricao, operacao)
VALUES ('compra_estorno', 'Estorno de entrada de compra', 'saida')
ON CONFLICT (codigo) DO NOTHING;
