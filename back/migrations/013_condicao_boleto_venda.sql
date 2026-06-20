ALTER TABLE financeiro_condicao_pagamento
  ADD COLUMN IF NOT EXISTS gera_boleto BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE financeiro_condicao_pagamento
SET gera_boleto = TRUE
WHERE tenant_id IS NOT NULL
  AND LOWER(unaccent(descricao)) LIKE '%boleto%';

UPDATE financeiro_forma_pagamento
SET ativo = FALSE,
    padrao = FALSE
WHERE tenant_id IS NOT NULL
  AND LOWER(unaccent(descricao)) LIKE '%boleto%';

INSERT INTO financeiro_condicao_pagamento (
  tenant_id,
  descricao,
  tipo,
  quantidade_parcelas,
  dias_primeiro_vencimento,
  intervalo_dias,
  percentual_entrada,
  ativo,
  padrao,
  gera_boleto
)
SELECT
  t.tenant_id,
  seed.descricao,
  'receber',
  seed.quantidade_parcelas,
  seed.dias_primeiro_vencimento,
  seed.intervalo_dias,
  0,
  TRUE,
  FALSE,
  TRUE
FROM tenant t
CROSS JOIN (
  VALUES
    ('Boleto à vista', 1, 0, 30),
    ('Boleto 30 dias', 1, 30, 30),
    ('Boleto 2x 30/60', 2, 30, 30),
    ('Boleto 3x 30/60/90', 3, 30, 30)
) AS seed(descricao, quantidade_parcelas, dias_primeiro_vencimento, intervalo_dias)
WHERE NOT EXISTS (
  SELECT 1
  FROM financeiro_condicao_pagamento cp
  WHERE cp.tenant_id = t.tenant_id
    AND LOWER(unaccent(cp.descricao)) = LOWER(unaccent(seed.descricao))
);
