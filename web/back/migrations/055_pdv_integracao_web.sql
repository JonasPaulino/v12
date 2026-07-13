ALTER TABLE tenant
  ADD COLUMN IF NOT EXISTS tenant_usa_pdv BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_tenant_usa_pdv
  ON tenant (tenant_usa_pdv, tenant_ativo);

INSERT INTO estoque_tipo_movimento (codigo, descricao, operacao)
VALUES
  ('pdv_venda_saida', 'Saída por venda no PDV', 'saida'),
  ('pdv_cancelamento_entrada', 'Estorno por cancelamento de venda no PDV', 'entrada')
ON CONFLICT (codigo) DO NOTHING;

CREATE SCHEMA IF NOT EXISTS pdv;

CREATE TABLE IF NOT EXISTS pdv.terminal (
  pdv_terminal_id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  terminal_codigo VARCHAR(40) NOT NULL,
  terminal_nome VARCHAR(120) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, terminal_codigo)
);

CREATE TABLE IF NOT EXISTS pdv.caixa (
  pdv_caixa_id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  pdv_terminal_id BIGINT NOT NULL REFERENCES pdv.terminal(pdv_terminal_id) ON DELETE CASCADE,
  caixa_local_id BIGINT,
  sessao_codigo VARCHAR(80) NOT NULL,
  operador_local_id BIGINT,
  operador_nome VARCHAR(150),
  status VARCHAR(20) NOT NULL DEFAULT 'aberto',
  valor_abertura NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_fechamento NUMERIC(14,2),
  diferenca_fechamento NUMERIC(14,2),
  observacao_abertura TEXT,
  observacao_fechamento TEXT,
  aberto_em TIMESTAMPTZ,
  fechado_em TIMESTAMPTZ,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, sessao_codigo)
);

CREATE TABLE IF NOT EXISTS pdv.caixa_movimento (
  pdv_caixa_movimento_id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  pdv_caixa_id BIGINT NOT NULL REFERENCES pdv.caixa(pdv_caixa_id) ON DELETE CASCADE,
  movimento_local_id BIGINT NOT NULL,
  operador_local_id BIGINT,
  operador_nome VARCHAR(150),
  tipo VARCHAR(20) NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  motivo TEXT,
  criado_em TIMESTAMPTZ,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sincronizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, pdv_caixa_id, movimento_local_id)
);

CREATE TABLE IF NOT EXISTS pdv.venda (
  pdv_venda_id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  pdv_terminal_id BIGINT NOT NULL REFERENCES pdv.terminal(pdv_terminal_id) ON DELETE CASCADE,
  pdv_caixa_id BIGINT REFERENCES pdv.caixa(pdv_caixa_id) ON DELETE SET NULL,
  venda_local_id BIGINT NOT NULL,
  sessao_codigo VARCHAR(80),
  pessoa_id INTEGER REFERENCES pessoa(pessoa_id) ON DELETE SET NULL,
  cliente_tipo_documento VARCHAR(20),
  cliente_documento VARCHAR(30),
  cliente_nome VARCHAR(180),
  cliente_email VARCHAR(180),
  status VARCHAR(20) NOT NULL DEFAULT 'concluida',
  total_produtos NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_liquido NUMERIC(14,2) NOT NULL DEFAULT 0,
  nfce_status VARCHAR(30),
  nfce_numero INTEGER,
  nfce_serie INTEGER,
  nfce_chave_acesso VARCHAR(80),
  estoque_aplicado BOOLEAN NOT NULL DEFAULT FALSE,
  estoque_estornado BOOLEAN NOT NULL DEFAULT FALSE,
  criada_em TIMESTAMPTZ,
  concluida_em TIMESTAMPTZ,
  cancelada_em TIMESTAMPTZ,
  cancelamento_motivo TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, venda_local_id)
);

CREATE TABLE IF NOT EXISTS pdv.venda_item (
  pdv_venda_item_id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  pdv_venda_id BIGINT NOT NULL REFERENCES pdv.venda(pdv_venda_id) ON DELETE CASCADE,
  venda_item_local_id BIGINT NOT NULL,
  produto_id INTEGER REFERENCES produto(produto_id) ON DELETE SET NULL,
  produto_erp_id INTEGER,
  codigo_produto VARCHAR(60),
  descricao VARCHAR(180) NOT NULL,
  unidade VARCHAR(20),
  quantidade NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_unitario NUMERIC(14,6) NOT NULL DEFAULT 0,
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (tenant_id, pdv_venda_id, venda_item_local_id)
);

CREATE TABLE IF NOT EXISTS pdv.venda_pagamento (
  pdv_venda_pagamento_id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  pdv_venda_id BIGINT NOT NULL REFERENCES pdv.venda(pdv_venda_id) ON DELETE CASCADE,
  pagamento_local_id BIGINT NOT NULL,
  forma VARCHAR(40) NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  autorizado BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (tenant_id, pdv_venda_id, pagamento_local_id)
);

CREATE INDEX IF NOT EXISTS idx_pdv_terminal_tenant_nome
  ON pdv.terminal (tenant_id, terminal_nome);

CREATE INDEX IF NOT EXISTS idx_pdv_caixa_tenant_status
  ON pdv.caixa (tenant_id, status, aberto_em DESC);

CREATE INDEX IF NOT EXISTS idx_pdv_caixa_terminal_abertura
  ON pdv.caixa (pdv_terminal_id, aberto_em DESC);

CREATE INDEX IF NOT EXISTS idx_pdv_caixa_movimento_caixa_tipo
  ON pdv.caixa_movimento (pdv_caixa_id, tipo, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_pdv_venda_tenant_status
  ON pdv.venda (tenant_id, status, concluida_em DESC, pdv_venda_id DESC);

CREATE INDEX IF NOT EXISTS idx_pdv_venda_tenant_cliente
  ON pdv.venda (tenant_id, cliente_documento, cliente_nome);

CREATE INDEX IF NOT EXISTS idx_pdv_venda_caixa
  ON pdv.venda (pdv_caixa_id, concluida_em DESC);

CREATE INDEX IF NOT EXISTS idx_pdv_venda_item_venda
  ON pdv.venda_item (pdv_venda_id);

CREATE INDEX IF NOT EXISTS idx_pdv_venda_item_produto
  ON pdv.venda_item (tenant_id, produto_id);

CREATE INDEX IF NOT EXISTS idx_pdv_venda_pagamento_venda
  ON pdv.venda_pagamento (pdv_venda_id);
