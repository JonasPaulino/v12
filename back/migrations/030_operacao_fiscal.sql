CREATE TABLE IF NOT EXISTS operacao_fiscal (
  operacao_fiscal_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  codigo VARCHAR(40) NOT NULL,
  descricao VARCHAR(140) NOT NULL,
  tipo_operacao VARCHAR(40) NOT NULL DEFAULT 'venda',
  natureza_operacao VARCHAR(120) NOT NULL,
  finalidade_nfe VARCHAR(20) NOT NULL DEFAULT 'normal',
  tipo_nfe VARCHAR(10),
  emite_nfe BOOLEAN NOT NULL DEFAULT FALSE,
  movimenta_estoque BOOLEAN NOT NULL DEFAULT TRUE,
  tipo_movimento_estoque VARCHAR(20) NOT NULL DEFAULT 'saida',
  gera_financeiro BOOLEAN NOT NULL DEFAULT TRUE,
  tipo_financeiro VARCHAR(10) NOT NULL DEFAULT 'receber',
  atualiza_custo BOOLEAN NOT NULL DEFAULT FALSE,
  regra_tributaria_id INTEGER REFERENCES regra_tributaria(regra_tributaria_id) ON DELETE SET NULL,
  observacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT operacao_fiscal_tipo_nfe_chk
    CHECK (tipo_nfe IS NULL OR tipo_nfe IN ('entrada', 'saida')),
  CONSTRAINT operacao_fiscal_movimento_chk
    CHECK (tipo_movimento_estoque IN ('entrada', 'saida', 'nenhum')),
  CONSTRAINT operacao_fiscal_financeiro_chk
    CHECK (tipo_financeiro IN ('receber', 'pagar', 'nenhum')),
  CONSTRAINT operacao_fiscal_codigo_unique
    UNIQUE (tenant_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_operacao_fiscal_tenant_descricao
  ON operacao_fiscal (tenant_id, descricao)
  WHERE excluido = FALSE;

CREATE INDEX IF NOT EXISTS idx_operacao_fiscal_regra
  ON operacao_fiscal (regra_tributaria_id);

ALTER TABLE operacao_fiscal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operacao_fiscal_rls ON operacao_fiscal;
CREATE POLICY operacao_fiscal_rls ON operacao_fiscal
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

CREATE OR REPLACE FUNCTION atualizar_operacao_fiscal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_operacao_fiscal_updated_at ON operacao_fiscal;
CREATE TRIGGER trg_operacao_fiscal_updated_at
BEFORE UPDATE ON operacao_fiscal
FOR EACH ROW
EXECUTE FUNCTION atualizar_operacao_fiscal_updated_at();

WITH primeira_regra AS (
  SELECT DISTINCT ON (r.tenant_id)
    r.tenant_id,
    r.regra_tributaria_id
  FROM regra_tributaria r
  WHERE r.excluido = FALSE
    AND r.ativo = TRUE
  ORDER BY r.tenant_id, r.prioridade DESC, r.descricao ASC
),
operacoes_padrao AS (
  SELECT
    t.tenant_id,
    pr.regra_tributaria_id,
    op.codigo,
    op.descricao,
    op.tipo_operacao,
    op.natureza_operacao,
    op.finalidade_nfe,
    op.tipo_nfe,
    op.emite_nfe,
    op.movimenta_estoque,
    op.tipo_movimento_estoque,
    op.gera_financeiro,
    op.tipo_financeiro,
    op.atualiza_custo
  FROM tenant t
  LEFT JOIN primeira_regra pr ON pr.tenant_id = t.tenant_id
  CROSS JOIN (
    VALUES
      (
        'VENDA_MERCADORIA',
        'Venda de mercadoria',
        'venda',
        'Venda de mercadoria',
        'normal',
        'saida',
        TRUE,
        TRUE,
        'saida',
        TRUE,
        'receber',
        FALSE
      ),
      (
        'COMPRA_REVENDA',
        'Compra para revenda',
        'compra',
        'Compra para revenda',
        'normal',
        'entrada',
        FALSE,
        TRUE,
        'entrada',
        TRUE,
        'pagar',
        TRUE
      ),
      (
        'BONIFICACAO_RECEBIDA',
        'Bonificação recebida',
        'bonificacao_entrada',
        'Bonificação recebida',
        'normal',
        'entrada',
        FALSE,
        TRUE,
        'entrada',
        FALSE,
        'nenhum',
        FALSE
      ),
      (
        'DEVOLUCAO_VENDA',
        'Devolução de venda',
        'devolucao_venda',
        'Devolução de venda',
        'devolucao',
        'entrada',
        TRUE,
        TRUE,
        'entrada',
        FALSE,
        'nenhum',
        FALSE
      ),
      (
        'DEVOLUCAO_COMPRA',
        'Devolução de compra',
        'devolucao_compra',
        'Devolução de compra',
        'devolucao',
        'saida',
        TRUE,
        TRUE,
        'saida',
        FALSE,
        'nenhum',
        FALSE
      )
  ) AS op(
    codigo,
    descricao,
    tipo_operacao,
    natureza_operacao,
    finalidade_nfe,
    tipo_nfe,
    emite_nfe,
    movimenta_estoque,
    tipo_movimento_estoque,
    gera_financeiro,
    tipo_financeiro,
    atualiza_custo
  )
)
INSERT INTO operacao_fiscal (
  tenant_id,
  regra_tributaria_id,
  codigo,
  descricao,
  tipo_operacao,
  natureza_operacao,
  finalidade_nfe,
  tipo_nfe,
  emite_nfe,
  movimenta_estoque,
  tipo_movimento_estoque,
  gera_financeiro,
  tipo_financeiro,
  atualiza_custo,
  ativo,
  excluido
)
SELECT
  tenant_id,
  regra_tributaria_id,
  codigo,
  descricao,
  tipo_operacao,
  natureza_operacao,
  finalidade_nfe,
  tipo_nfe,
  emite_nfe,
  movimenta_estoque,
  tipo_movimento_estoque,
  gera_financeiro,
  tipo_financeiro,
  atualiza_custo,
  TRUE,
  FALSE
FROM operacoes_padrao
ON CONFLICT (tenant_id, codigo) DO NOTHING;
