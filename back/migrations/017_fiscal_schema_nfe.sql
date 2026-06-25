CREATE SCHEMA IF NOT EXISTS fiscal;

CREATE TABLE IF NOT EXISTS fiscal.nfe (
  nfe_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  pedido_venda_id INTEGER REFERENCES pedido_venda(pedido_venda_id) ON DELETE SET NULL,
  emitente_pessoa_id INTEGER REFERENCES pessoa(pessoa_id),
  destinatario_pessoa_id INTEGER REFERENCES pessoa(pessoa_id),
  usuario_id INTEGER REFERENCES usuario(usuario_id) ON DELETE SET NULL,
  modelo VARCHAR(2) NOT NULL DEFAULT '55',
  serie INTEGER NOT NULL,
  numero INTEGER,
  chave_acesso VARCHAR(44),
  natureza_operacao VARCHAR(120) NOT NULL,
  tipo_operacao VARCHAR(10) NOT NULL,
  finalidade VARCHAR(20) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'rascunho',
  ambiente_nfe VARCHAR(1) NOT NULL DEFAULT '2',
  status_sefaz VARCHAR(20),
  valor_produtos NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_acrescimo NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  observacao TEXT,
  xml_assinado TEXT,
  xml_autorizado TEXT,
  protocolo VARCHAR(30),
  recibo VARCHAR(30),
  data_autorizacao TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal.nfe_item (
  nfe_item_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  nfe_id INTEGER NOT NULL REFERENCES fiscal.nfe(nfe_id) ON DELETE CASCADE,
  pedido_venda_item_id INTEGER REFERENCES pedido_venda_item(pedido_venda_item_id) ON DELETE SET NULL,
  produto_id INTEGER REFERENCES produto(produto_id),
  codigo_produto VARCHAR(60) NOT NULL,
  descricao VARCHAR(240) NOT NULL,
  ncm VARCHAR(8) NOT NULL,
  cest VARCHAR(7),
  cfop VARCHAR(4),
  unidade_comercial VARCHAR(10) NOT NULL,
  quantidade NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_unitario NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_desconto NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_acrescimo NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_total NUMERIC(14,4) NOT NULL DEFAULT 0,
  origem_mercadoria VARCHAR(1),
  gtin VARCHAR(20),
  gtin_tributavel VARCHAR(20),
  unidade_tributavel VARCHAR(10),
  quantidade_tributavel NUMERIC(14,4),
  valor_unitario_tributavel NUMERIC(14,4),
  valor_frete NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_seguro NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_outras_despesas NUMERIC(14,4) NOT NULL DEFAULT 0,
  ind_tot VARCHAR(1) NOT NULL DEFAULT '1',
  cbenef VARCHAR(10),
  fci VARCHAR(36),
  informacao_adicional_item TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal.nfe_item_imposto (
  nfe_item_imposto_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  nfe_id INTEGER NOT NULL REFERENCES fiscal.nfe(nfe_id) ON DELETE CASCADE,
  nfe_item_id INTEGER NOT NULL UNIQUE REFERENCES fiscal.nfe_item(nfe_item_id) ON DELETE CASCADE,
  icms_origem VARCHAR(1),
  icms_cst VARCHAR(3),
  icms_csosn VARCHAR(3),
  icms_aliquota NUMERIC(9,4),
  icms_base NUMERIC(14,4),
  icms_valor NUMERIC(14,4),
  icms_reducao_base NUMERIC(9,4),
  icms_st_aliquota NUMERIC(9,4),
  icms_st_base NUMERIC(14,4),
  icms_st_valor NUMERIC(14,4),
  fcp_aliquota NUMERIC(9,4),
  fcp_valor NUMERIC(14,4),
  pis_cst VARCHAR(2),
  pis_base NUMERIC(14,4),
  pis_aliquota NUMERIC(9,4),
  pis_valor NUMERIC(14,4),
  cofins_cst VARCHAR(2),
  cofins_base NUMERIC(14,4),
  cofins_aliquota NUMERIC(9,4),
  cofins_valor NUMERIC(14,4),
  ipi_cst VARCHAR(2),
  ipi_base NUMERIC(14,4),
  ipi_aliquota NUMERIC(9,4),
  ipi_valor NUMERIC(14,4),
  ipi_enquadramento VARCHAR(3),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal.nfe_evento (
  nfe_evento_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  nfe_id INTEGER NOT NULL REFERENCES fiscal.nfe(nfe_id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuario(usuario_id) ON DELETE SET NULL,
  tipo_evento VARCHAR(80) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pendente',
  mensagem TEXT,
  payload_json JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal.nfe_xml (
  nfe_xml_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  nfe_id INTEGER NOT NULL REFERENCES fiscal.nfe(nfe_id) ON DELETE CASCADE,
  tipo_xml VARCHAR(30) NOT NULL,
  chave_acesso VARCHAR(44),
  conteudo_xml TEXT NOT NULL,
  hash_sha256 VARCHAR(64) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal.nfe_importacao_xml (
  nfe_importacao_xml_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  nfe_id INTEGER NOT NULL REFERENCES fiscal.nfe(nfe_id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuario(usuario_id) ON DELETE SET NULL,
  chave_acesso VARCHAR(44),
  origem VARCHAR(80),
  conteudo_xml TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_tenant ON fiscal.nfe (tenant_id, status, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_pedido ON fiscal.nfe (pedido_venda_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_chave ON fiscal.nfe (chave_acesso);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_item_nfe ON fiscal.nfe_item (nfe_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_item_imposto_nfe ON fiscal.nfe_item_imposto (nfe_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_evento_nfe ON fiscal.nfe_evento (nfe_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_xml_nfe ON fiscal.nfe_xml (nfe_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_importacao_xml_nfe ON fiscal.nfe_importacao_xml (nfe_id, criado_em DESC);
