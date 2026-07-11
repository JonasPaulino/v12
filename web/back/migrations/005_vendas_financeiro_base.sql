CREATE TABLE IF NOT EXISTS financeiro_condicao_pagamento (
  financeiro_condicao_pagamento_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  descricao VARCHAR(120) NOT NULL,
  tipo VARCHAR(10) NOT NULL DEFAULT 'ambos'
    CHECK (tipo IN ('receber', 'pagar', 'ambos')),
  quantidade_parcelas INTEGER NOT NULL DEFAULT 1,
  dias_primeiro_vencimento INTEGER NOT NULL DEFAULT 0,
  intervalo_dias INTEGER NOT NULL DEFAULT 30,
  percentual_entrada NUMERIC(7,4) NOT NULL DEFAULT 0,
  gera_boleto BOOLEAN NOT NULL DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  padrao BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, descricao)
);

CREATE TABLE IF NOT EXISTS financeiro_forma_pagamento (
  financeiro_forma_pagamento_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  descricao VARCHAR(120) NOT NULL,
  tipo VARCHAR(10) NOT NULL DEFAULT 'ambos'
    CHECK (tipo IN ('receber', 'pagar', 'ambos')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  padrao BOOLEAN NOT NULL DEFAULT FALSE,
  sincronizar_pdv BOOLEAN NOT NULL DEFAULT FALSE,
  ordem INTEGER NOT NULL DEFAULT 1,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, descricao)
);

CREATE TABLE IF NOT EXISTS pedido_venda (
  pedido_venda_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  pessoa_id INTEGER NOT NULL REFERENCES pessoa(pessoa_id),
  usuario_id INTEGER REFERENCES usuario(usuario_id),
  financeiro_condicao_pagamento_id INTEGER REFERENCES financeiro_condicao_pagamento(financeiro_condicao_pagamento_id),
  status VARCHAR(20) NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'faturado', 'cancelado')),
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_entrega DATE,
  observacao TEXT,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
  acrescimo NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedido_venda_item (
  pedido_venda_item_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  pedido_venda_id INTEGER NOT NULL REFERENCES pedido_venda(pedido_venda_id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produto(produto_id),
  codigo_interno VARCHAR(60) NOT NULL,
  descricao VARCHAR(180) NOT NULL,
  unidade_sigla VARCHAR(10),
  quantidade NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_unitario NUMERIC(14,4) NOT NULL DEFAULT 0,
  desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
  acrescimo NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financeiro_titulo (
  financeiro_titulo_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  pedido_venda_id INTEGER REFERENCES pedido_venda(pedido_venda_id) ON DELETE SET NULL,
  pessoa_id INTEGER NOT NULL REFERENCES pessoa(pessoa_id),
  financeiro_condicao_pagamento_id INTEGER REFERENCES financeiro_condicao_pagamento(financeiro_condicao_pagamento_id),
  numero_documento VARCHAR(40),
  descricao VARCHAR(180),
  tipo VARCHAR(10) NOT NULL DEFAULT 'receber'
    CHECK (tipo IN ('receber', 'pagar')),
  status VARCHAR(20) NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'parcial', 'quitado', 'cancelado', 'vencido')),
  valor_original NUMERIC(14,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
  acrescimo NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_final NUMERIC(14,2) GENERATED ALWAYS AS (valor_original - desconto + acrescimo) STORED,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financeiro_titulo_parcela (
  financeiro_titulo_parcela_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  financeiro_titulo_id INTEGER NOT NULL REFERENCES financeiro_titulo(financeiro_titulo_id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor_parcela NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_recebido NUMERIC(14,2) NOT NULL DEFAULT 0,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'aberta'
    CHECK (status IN ('aberta', 'parcial', 'quitada', 'vencida', 'cancelada')),
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (financeiro_titulo_id, numero_parcela)
);

CREATE TABLE IF NOT EXISTS financeiro_titulo_baixa (
  financeiro_titulo_baixa_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  financeiro_titulo_id INTEGER NOT NULL REFERENCES financeiro_titulo(financeiro_titulo_id) ON DELETE CASCADE,
  financeiro_titulo_parcela_id INTEGER REFERENCES financeiro_titulo_parcela(financeiro_titulo_parcela_id) ON DELETE SET NULL,
  financeiro_forma_pagamento_id INTEGER REFERENCES financeiro_forma_pagamento(financeiro_forma_pagamento_id),
  valor_baixa NUMERIC(14,2) NOT NULL DEFAULT 0,
  data_baixa TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observacao TEXT,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fin_cond_pagamento_tenant ON financeiro_condicao_pagamento (tenant_id, ativo, tipo);
CREATE INDEX IF NOT EXISTS idx_fin_forma_pagamento_tenant ON financeiro_forma_pagamento (tenant_id, ativo, tipo);
CREATE INDEX IF NOT EXISTS idx_fin_forma_pagamento_tenant_pdv ON financeiro_forma_pagamento (tenant_id, ativo, tipo, sincronizar_pdv);
CREATE INDEX IF NOT EXISTS idx_pedido_venda_tenant ON pedido_venda (tenant_id, excluido, data_emissao DESC);
CREATE INDEX IF NOT EXISTS idx_pedido_venda_pessoa ON pedido_venda (tenant_id, pessoa_id, excluido);
CREATE INDEX IF NOT EXISTS idx_pedido_venda_item_pedido ON pedido_venda_item (pedido_venda_id);
CREATE INDEX IF NOT EXISTS idx_fin_titulo_tenant ON financeiro_titulo (tenant_id, tipo, status, excluido, data_vencimento);
CREATE INDEX IF NOT EXISTS idx_fin_titulo_pedido ON financeiro_titulo (pedido_venda_id);
CREATE INDEX IF NOT EXISTS idx_fin_titulo_parcela_titulo ON financeiro_titulo_parcela (financeiro_titulo_id, status, data_vencimento);
CREATE INDEX IF NOT EXISTS idx_fin_titulo_baixa_titulo ON financeiro_titulo_baixa (financeiro_titulo_id, data_baixa);

DROP TRIGGER IF EXISTS trg_financeiro_condicao_pagamento_updated_at ON financeiro_condicao_pagamento;
CREATE TRIGGER trg_financeiro_condicao_pagamento_updated_at
BEFORE UPDATE ON financeiro_condicao_pagamento
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_financeiro_forma_pagamento_updated_at ON financeiro_forma_pagamento;
CREATE TRIGGER trg_financeiro_forma_pagamento_updated_at
BEFORE UPDATE ON financeiro_forma_pagamento
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_pedido_venda_updated_at ON pedido_venda;
CREATE TRIGGER trg_pedido_venda_updated_at
BEFORE UPDATE ON pedido_venda
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_pedido_venda_item_updated_at ON pedido_venda_item;
CREATE TRIGGER trg_pedido_venda_item_updated_at
BEFORE UPDATE ON pedido_venda_item
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_financeiro_titulo_updated_at ON financeiro_titulo;
CREATE TRIGGER trg_financeiro_titulo_updated_at
BEFORE UPDATE ON financeiro_titulo
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_financeiro_titulo_parcela_updated_at ON financeiro_titulo_parcela;
CREATE TRIGGER trg_financeiro_titulo_parcela_updated_at
BEFORE UPDATE ON financeiro_titulo_parcela
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_financeiro_titulo_baixa_updated_at ON financeiro_titulo_baixa;
CREATE TRIGGER trg_financeiro_titulo_baixa_updated_at
BEFORE UPDATE ON financeiro_titulo_baixa
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE financeiro_condicao_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_forma_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_venda_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_titulo ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_titulo_parcela ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_titulo_baixa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financeiro_condicao_pagamento_rls ON financeiro_condicao_pagamento;
CREATE POLICY financeiro_condicao_pagamento_rls ON financeiro_condicao_pagamento
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS financeiro_forma_pagamento_rls ON financeiro_forma_pagamento;
CREATE POLICY financeiro_forma_pagamento_rls ON financeiro_forma_pagamento
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS pedido_venda_rls ON pedido_venda;
CREATE POLICY pedido_venda_rls ON pedido_venda
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS pedido_venda_item_rls ON pedido_venda_item;
CREATE POLICY pedido_venda_item_rls ON pedido_venda_item
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS financeiro_titulo_rls ON financeiro_titulo;
CREATE POLICY financeiro_titulo_rls ON financeiro_titulo
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS financeiro_titulo_parcela_rls ON financeiro_titulo_parcela;
CREATE POLICY financeiro_titulo_parcela_rls ON financeiro_titulo_parcela
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS financeiro_titulo_baixa_rls ON financeiro_titulo_baixa;
CREATE POLICY financeiro_titulo_baixa_rls ON financeiro_titulo_baixa
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

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
  seed.descricao,
  seed.tipo,
  seed.quantidade_parcelas,
  seed.dias_primeiro_vencimento,
  seed.intervalo_dias,
  seed.percentual_entrada,
  seed.gera_boleto,
  TRUE,
  seed.padrao
FROM tenant t
CROSS JOIN (
  VALUES
    ('A vista', 'receber', 1, 0, 30, 0::numeric, FALSE, TRUE),
    ('30 dias', 'receber', 1, 30, 30, 0::numeric, FALSE, FALSE),
    ('2x 30/60', 'receber', 2, 30, 30, 0::numeric, FALSE, FALSE),
    ('3x 30/60/90', 'receber', 3, 30, 30, 0::numeric, FALSE, FALSE),
    ('Boleto à vista', 'receber', 1, 0, 30, 0::numeric, TRUE, FALSE),
    ('Boleto 30 dias', 'receber', 1, 30, 30, 0::numeric, TRUE, FALSE),
    ('Boleto 2x 30/60', 'receber', 2, 30, 30, 0::numeric, TRUE, FALSE),
    ('Boleto 3x 30/60/90', 'receber', 3, 30, 30, 0::numeric, TRUE, FALSE),
    ('A vista fornecedor', 'pagar', 1, 0, 30, 0::numeric, FALSE, FALSE)
) AS seed(descricao, tipo, quantidade_parcelas, dias_primeiro_vencimento, intervalo_dias, percentual_entrada, gera_boleto, padrao)
WHERE NOT EXISTS (
  SELECT 1
  FROM financeiro_condicao_pagamento cp
  WHERE cp.tenant_id = t.tenant_id
);

INSERT INTO financeiro_forma_pagamento (
  tenant_id,
  descricao,
  tipo,
  ativo,
  padrao,
  sincronizar_pdv,
  ordem
)
SELECT
  t.tenant_id,
  seed.descricao,
  seed.tipo,
  TRUE,
  seed.padrao,
  TRUE,
  seed.ordem
FROM tenant t
CROSS JOIN (
  VALUES
    ('Dinheiro', 'ambos', TRUE, 1),
    ('Pix', 'ambos', FALSE, 2),
    ('Cartao de debito', 'receber', FALSE, 3),
    ('Cartao de credito', 'receber', FALSE, 4),
    ('Transferencia', 'ambos', FALSE, 5)
) AS seed(descricao, tipo, padrao, ordem)
WHERE NOT EXISTS (
  SELECT 1
  FROM financeiro_forma_pagamento fp
  WHERE fp.tenant_id = t.tenant_id
);
