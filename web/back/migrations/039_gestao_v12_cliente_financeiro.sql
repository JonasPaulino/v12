CREATE SCHEMA IF NOT EXISTS gestao;

CREATE TABLE IF NOT EXISTS gestao.cliente_contrato (
  contrato_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  plano_nome VARCHAR(120) NOT NULL DEFAULT 'V12 ERP',
  ciclo VARCHAR(20) NOT NULL DEFAULT 'mensal',
  forma_cobranca VARCHAR(20) NOT NULL DEFAULT 'boleto',
  valor_mensal NUMERIC(14,2) NOT NULL DEFAULT 0,
  quantidade_parcelas INTEGER NOT NULL DEFAULT 1,
  dia_vencimento INTEGER NOT NULL DEFAULT 10,
  primeiro_vencimento DATE,
  juros_mora_percentual NUMERIC(8,4) NOT NULL DEFAULT 0,
  multa_atraso_percentual NUMERIC(8,4) NOT NULL DEFAULT 0,
  bloquear_apos_dias INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo',
  observacao TEXT,
  criado_por INTEGER REFERENCES usuario(usuario_id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cliente_contrato_ciclo_chk
    CHECK (ciclo IN ('mensal', 'trimestral', 'semestral', 'anual')),
  CONSTRAINT cliente_contrato_forma_chk
    CHECK (forma_cobranca IN ('boleto', 'pix')),
  CONSTRAINT cliente_contrato_status_chk
    CHECK (status IN ('ativo', 'suspenso', 'encerrado')),
  CONSTRAINT cliente_contrato_valor_chk
    CHECK (valor_mensal >= 0),
  CONSTRAINT cliente_contrato_parcelas_chk
    CHECK (quantidade_parcelas BETWEEN 1 AND 120),
  CONSTRAINT cliente_contrato_dia_chk
    CHECK (dia_vencimento BETWEEN 1 AND 31)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cliente_contrato_tenant_ativo
  ON gestao.cliente_contrato (tenant_id)
  WHERE status = 'ativo';

CREATE INDEX IF NOT EXISTS idx_cliente_contrato_tenant
  ON gestao.cliente_contrato (tenant_id, status);

CREATE TABLE IF NOT EXISTS gestao.cliente_parcela (
  parcela_id SERIAL PRIMARY KEY,
  contrato_id INTEGER NOT NULL REFERENCES gestao.cliente_contrato(contrato_id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  descricao VARCHAR(180) NOT NULL,
  forma_cobranca VARCHAR(20) NOT NULL DEFAULT 'boleto',
  valor NUMERIC(14,2) NOT NULL,
  vencimento DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'aberta',
  asaas_charge_id VARCHAR(120),
  asaas_invoice_url TEXT,
  asaas_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  pago_em DATE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cliente_parcela_forma_chk
    CHECK (forma_cobranca IN ('boleto', 'pix')),
  CONSTRAINT cliente_parcela_status_chk
    CHECK (status IN ('aberta', 'gerada', 'paga', 'vencida', 'cancelada')),
  CONSTRAINT cliente_parcela_valor_chk
    CHECK (valor >= 0),
  CONSTRAINT cliente_parcela_numero_chk
    CHECK (numero_parcela > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cliente_parcela_contrato_numero
  ON gestao.cliente_parcela (contrato_id, numero_parcela);

CREATE INDEX IF NOT EXISTS idx_cliente_parcela_tenant_status
  ON gestao.cliente_parcela (tenant_id, status, vencimento);

DROP TRIGGER IF EXISTS trg_cliente_contrato_updated_at ON gestao.cliente_contrato;
CREATE TRIGGER trg_cliente_contrato_updated_at
BEFORE UPDATE ON gestao.cliente_contrato
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_cliente_parcela_updated_at ON gestao.cliente_parcela;
CREATE TRIGGER trg_cliente_parcela_updated_at
BEFORE UPDATE ON gestao.cliente_parcela
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
