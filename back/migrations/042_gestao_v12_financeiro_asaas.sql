CREATE SCHEMA IF NOT EXISTS gestao;

ALTER TABLE gestao.pessoa
  ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR(120);

ALTER TABLE gestao.financeiro_parcela
  ADD COLUMN IF NOT EXISTS forma_cobranca VARCHAR(20) NOT NULL DEFAULT 'boleto';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gestao_fin_parcela_forma_chk'
      AND conrelid = 'gestao.financeiro_parcela'::regclass
  ) THEN
    ALTER TABLE gestao.financeiro_parcela
      ADD CONSTRAINT gestao_fin_parcela_forma_chk
      CHECK (forma_cobranca IN ('boleto', 'pix'));
  END IF;
END $$;

WITH contratos_sem_titulo AS (
  SELECT
    cc.contrato_id,
    cc.tenant_id,
    cc.pessoa_id,
    cc.plano_nome,
    cc.valor_mensal,
    cc.quantidade_parcelas,
    cc.observacao
  FROM gestao.cliente_contrato cc
  LEFT JOIN gestao.financeiro_titulo ft
    ON ft.contrato_id = cc.contrato_id
   AND ft.origem = 'contrato_v12'
   AND ft.excluido = FALSE
  WHERE ft.titulo_id IS NULL
),
titulos_inseridos AS (
  INSERT INTO gestao.financeiro_titulo (
    pessoa_id,
    tenant_id,
    contrato_id,
    tipo,
    origem,
    descricao,
    documento,
    valor_total,
    data_emissao,
    status,
    observacao
  )
  SELECT
    pessoa_id,
    tenant_id,
    contrato_id,
    'receber',
    'contrato_v12',
    COALESCE(NULLIF(plano_nome, ''), 'Mensalidade V12 ERP'),
    'CONTRATO-' || contrato_id,
    COALESCE(valor_mensal, 0) * COALESCE(quantidade_parcelas, 1),
    CURRENT_DATE,
    'aberto',
    observacao
  FROM contratos_sem_titulo
  RETURNING titulo_id, contrato_id
)
INSERT INTO gestao.financeiro_parcela (
  titulo_id,
  numero_parcela,
  valor,
  vencimento,
  status,
  forma_cobranca
)
SELECT
  ti.titulo_id,
  cp.numero_parcela,
  cp.valor,
  cp.vencimento,
  CASE
    WHEN cp.status = 'pago' THEN 'quitado'
    WHEN cp.status = 'cancelada' THEN 'cancelado'
    WHEN cp.status = 'vencida' OR cp.vencimento < CURRENT_DATE THEN 'vencido'
    ELSE 'aberto'
  END,
  CASE WHEN cp.forma_cobranca = 'pix' THEN 'pix' ELSE 'boleto' END
FROM titulos_inseridos ti
JOIN gestao.cliente_parcela cp
  ON cp.contrato_id = ti.contrato_id
ON CONFLICT (titulo_id, numero_parcela) DO NOTHING;

INSERT INTO gestao.configuracao (chave, valor_json, descricao)
VALUES (
  'asaas_v12',
  '{"ambiente":"sandbox","ativo":false}'::jsonb,
  'Configuração da conta Asaas própria da Gestão V12.'
)
ON CONFLICT (chave) DO NOTHING;
