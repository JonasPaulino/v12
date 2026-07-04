ALTER TABLE regra_tributaria
  ADD COLUMN IF NOT EXISTS origem_mercadoria VARCHAR(1) NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS cfop_venda_interna VARCHAR(4),
  ADD COLUMN IF NOT EXISTS cfop_venda_interestadual VARCHAR(4),
  ADD COLUMN IF NOT EXISTS cfop_compra VARCHAR(4),
  ADD COLUMN IF NOT EXISTS cbenef VARCHAR(10),
  ADD COLUMN IF NOT EXISTS observacao TEXT;

ALTER TABLE produto_fiscal
  ADD COLUMN IF NOT EXISTS regra_tributaria_id INTEGER REFERENCES regra_tributaria(regra_tributaria_id);

CREATE INDEX IF NOT EXISTS idx_produto_fiscal_regra_tributaria
  ON produto_fiscal (regra_tributaria_id);

CREATE INDEX IF NOT EXISTS idx_regra_tributaria_tenant_descricao
  ON regra_tributaria (tenant_id, descricao)
  WHERE excluido = FALSE;

WITH tenants_base AS (
  SELECT tenant_id
  FROM tenant
),
regras_padrao AS (
  INSERT INTO regra_tributaria (
    tenant_id,
    descricao,
    regime_tributario,
    crt_emitente,
    tipo_operacao,
    finalidade_nfe,
    consumidor_final,
    contribuinte_icms,
    origem_mercadoria,
    cfop_venda_interna,
    cfop_venda_interestadual,
    cfop_compra,
    prioridade,
    ativo,
    excluido
  )
  SELECT
    t.tenant_id,
    'Venda Simples Nacional',
    'simples_nacional',
    '1',
    'saida',
    'normal',
    TRUE,
    FALSE,
    '0',
    '5101',
    '6101',
    NULL,
    0,
    TRUE,
    FALSE
  FROM tenants_base t
  WHERE NOT EXISTS (
    SELECT 1
    FROM regra_tributaria r
    WHERE r.tenant_id = t.tenant_id
      AND r.excluido = FALSE
  )
  RETURNING regra_tributaria_id
)
INSERT INTO regra_tributaria_icms (
  regra_tributaria_id,
  csosn,
  aliquota_icms,
  reducao_base,
  aliquota_fcp,
  modalidade_bc
)
SELECT
  regra_tributaria_id,
  '102',
  0,
  0,
  0,
  '3'
FROM regras_padrao
ON CONFLICT (regra_tributaria_id) DO NOTHING;

INSERT INTO regra_tributaria_pis (
  regra_tributaria_id,
  cst,
  aliquota
)
SELECT
  r.regra_tributaria_id,
  '99',
  0
FROM regra_tributaria r
WHERE r.descricao = 'Venda Simples Nacional'
  AND r.excluido = FALSE
ON CONFLICT (regra_tributaria_id) DO NOTHING;

INSERT INTO regra_tributaria_cofins (
  regra_tributaria_id,
  cst,
  aliquota
)
SELECT
  r.regra_tributaria_id,
  '99',
  0
FROM regra_tributaria r
WHERE r.descricao = 'Venda Simples Nacional'
  AND r.excluido = FALSE
ON CONFLICT (regra_tributaria_id) DO NOTHING;

WITH primeira_regra AS (
  SELECT DISTINCT ON (r.tenant_id)
    r.tenant_id,
    r.regra_tributaria_id,
    r.origem_mercadoria,
    r.cfop_venda_interna,
    r.cfop_venda_interestadual
  FROM regra_tributaria r
  WHERE r.excluido = FALSE
    AND r.ativo = TRUE
  ORDER BY
    r.tenant_id,
    CASE WHEN r.descricao = 'Venda Simples Nacional' THEN 0 ELSE 1 END,
    r.prioridade DESC,
    r.regra_tributaria_id
)
UPDATE produto_fiscal pf
SET regra_tributaria_id = regra.regra_tributaria_id,
    origem_mercadoria = COALESCE(NULLIF(pf.origem_mercadoria, ''), regra.origem_mercadoria),
    cfop_venda_interna = COALESCE(NULLIF(pf.cfop_venda_interna, ''), regra.cfop_venda_interna),
    cfop_venda_interestadual = COALESCE(NULLIF(pf.cfop_venda_interestadual, ''), regra.cfop_venda_interestadual)
FROM primeira_regra regra
WHERE regra.tenant_id = pf.tenant_id
  AND pf.regra_tributaria_id IS NULL;
