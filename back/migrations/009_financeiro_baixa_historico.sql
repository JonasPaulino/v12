ALTER TABLE financeiro_titulo_baixa
  ADD COLUMN IF NOT EXISTS usuario_baixa_id INTEGER REFERENCES usuario(usuario_id) ON DELETE SET NULL;

ALTER TABLE financeiro_titulo_baixa
  ADD COLUMN IF NOT EXISTS usuario_estorno_id INTEGER REFERENCES usuario(usuario_id) ON DELETE SET NULL;

ALTER TABLE financeiro_titulo_baixa
  ADD COLUMN IF NOT EXISTS estornado_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_fin_titulo_baixa_usuario_baixa
  ON financeiro_titulo_baixa (usuario_baixa_id);

CREATE INDEX IF NOT EXISTS idx_fin_titulo_baixa_usuario_estorno
  ON financeiro_titulo_baixa (usuario_estorno_id);
