ALTER TABLE financeiro_titulo
  ADD COLUMN IF NOT EXISTS entrada_mercadoria_id INTEGER REFERENCES entrada_mercadoria(entrada_mercadoria_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fin_titulo_entrada_mercadoria
  ON financeiro_titulo (entrada_mercadoria_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fin_titulo_entrada_ativa
  ON financeiro_titulo (tenant_id, entrada_mercadoria_id)
  WHERE entrada_mercadoria_id IS NOT NULL AND excluido = FALSE;

INSERT INTO financeiro_condicao_pagamento (
  tenant_id,
  descricao,
  tipo,
  quantidade_parcelas,
  dias_primeiro_vencimento,
  intervalo_dias,
  percentual_entrada,
  gera_boleto,
  ativo,
  padrao
)
SELECT
  t.tenant_id,
  'A vista fornecedor',
  'pagar',
  1,
  0,
  30,
  0,
  FALSE,
  TRUE,
  FALSE
FROM tenant t
WHERE NOT EXISTS (
  SELECT 1
  FROM financeiro_condicao_pagamento cp
  WHERE cp.tenant_id = t.tenant_id
    AND cp.ativo = TRUE
    AND cp.tipo IN ('pagar', 'ambos')
);
