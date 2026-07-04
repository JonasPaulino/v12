CREATE TABLE IF NOT EXISTS unidade_medida (
  unidade_medida_id SERIAL PRIMARY KEY,
  sigla VARCHAR(10) NOT NULL UNIQUE,
  descricao VARCHAR(60) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tabela_preco (
  tabela_preco_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  padrao BOOLEAN NOT NULL DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, nome)
);

CREATE TABLE IF NOT EXISTS deposito (
  deposito_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  padrao BOOLEAN NOT NULL DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, nome)
);

CREATE TABLE IF NOT EXISTS produto (
  produto_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  codigo_interno VARCHAR(60),
  descricao VARCHAR(180) NOT NULL,
  descricao_fiscal VARCHAR(240) NOT NULL,
  gtin VARCHAR(20),
  marca VARCHAR(120),
  tipo_produto VARCHAR(20) NOT NULL DEFAULT 'mercadoria',
  controla_estoque BOOLEAN NOT NULL DEFAULT TRUE,
  permite_fracionar BOOLEAN NOT NULL DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produto_fiscal (
  produto_fiscal_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL UNIQUE REFERENCES produto(produto_id) ON DELETE CASCADE,
  ncm VARCHAR(8) NOT NULL,
  cest VARCHAR(7),
  extipi VARCHAR(3),
  origem_mercadoria VARCHAR(1) NOT NULL DEFAULT '0',
  cbenef VARCHAR(10),
  fci VARCHAR(36),
  cfop_venda_interna VARCHAR(4),
  cfop_venda_interestadual VARCHAR(4),
  cfop_compra VARCHAR(4),
  ind_escala VARCHAR(1),
  cnpj_fabricante VARCHAR(14),
  exige_lote BOOLEAN NOT NULL DEFAULT FALSE,
  exige_validade BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produto_unidade (
  produto_unidade_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL UNIQUE REFERENCES produto(produto_id) ON DELETE CASCADE,
  unidade_comercial_id INTEGER NOT NULL REFERENCES unidade_medida(unidade_medida_id),
  unidade_tributavel_id INTEGER NOT NULL REFERENCES unidade_medida(unidade_medida_id),
  fator_conversao NUMERIC(18,6) NOT NULL DEFAULT 1,
  casas_decimais_comercial SMALLINT NOT NULL DEFAULT 2,
  casas_decimais_tributavel SMALLINT NOT NULL DEFAULT 2,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produto_preco (
  produto_preco_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produto(produto_id) ON DELETE CASCADE,
  tabela_preco_id INTEGER NOT NULL REFERENCES tabela_preco(tabela_preco_id),
  preco_venda NUMERIC(14,4) NOT NULL DEFAULT 0,
  preco_custo NUMERIC(14,4) NOT NULL DEFAULT 0,
  margem NUMERIC(9,4) NOT NULL DEFAULT 0,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (produto_id, tabela_preco_id)
);

CREATE TABLE IF NOT EXISTS produto_estoque (
  produto_estoque_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produto(produto_id) ON DELETE CASCADE,
  deposito_id INTEGER NOT NULL REFERENCES deposito(deposito_id),
  estoque_atual NUMERIC(14,4) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(14,4) NOT NULL DEFAULT 0,
  estoque_reservado NUMERIC(14,4) NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (produto_id, deposito_id)
);

CREATE TABLE IF NOT EXISTS estoque_movimento (
  estoque_movimento_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produto(produto_id) ON DELETE CASCADE,
  deposito_id INTEGER REFERENCES deposito(deposito_id),
  tipo_movimento VARCHAR(30) NOT NULL,
  quantidade NUMERIC(14,4) NOT NULL,
  valor_unitario NUMERIC(14,4) NOT NULL DEFAULT 0,
  origem VARCHAR(40) NOT NULL,
  documento_tipo VARCHAR(40),
  documento_id INTEGER,
  observacao TEXT,
  data_movimento TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS regra_tributaria (
  regra_tributaria_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  descricao VARCHAR(180) NOT NULL,
  regime_tributario VARCHAR(20) NOT NULL,
  crt_emitente VARCHAR(1),
  uf_origem CHAR(2),
  uf_destino CHAR(2),
  tipo_operacao VARCHAR(20),
  finalidade_nfe VARCHAR(20),
  consumidor_final BOOLEAN,
  contribuinte_icms BOOLEAN,
  cfop VARCHAR(4),
  ncm VARCHAR(8),
  produto_id INTEGER REFERENCES produto(produto_id),
  vigencia_inicio DATE,
  vigencia_fim DATE,
  prioridade INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS regra_tributaria_icms (
  regra_tributaria_icms_id SERIAL PRIMARY KEY,
  regra_tributaria_id INTEGER NOT NULL UNIQUE REFERENCES regra_tributaria(regra_tributaria_id) ON DELETE CASCADE,
  cst VARCHAR(3),
  csosn VARCHAR(3),
  aliquota_icms NUMERIC(9,4),
  reducao_base NUMERIC(9,4),
  aliquota_fcp NUMERIC(9,4),
  modalidade_bc VARCHAR(2),
  modalidade_bc_st VARCHAR(2),
  aliquota_mva_st NUMERIC(9,4),
  aliquota_icms_st NUMERIC(9,4)
);

CREATE TABLE IF NOT EXISTS regra_tributaria_pis (
  regra_tributaria_pis_id SERIAL PRIMARY KEY,
  regra_tributaria_id INTEGER NOT NULL UNIQUE REFERENCES regra_tributaria(regra_tributaria_id) ON DELETE CASCADE,
  cst VARCHAR(2),
  aliquota NUMERIC(9,4),
  aliquota_reais NUMERIC(14,4)
);

CREATE TABLE IF NOT EXISTS regra_tributaria_cofins (
  regra_tributaria_cofins_id SERIAL PRIMARY KEY,
  regra_tributaria_id INTEGER NOT NULL UNIQUE REFERENCES regra_tributaria(regra_tributaria_id) ON DELETE CASCADE,
  cst VARCHAR(2),
  aliquota NUMERIC(9,4),
  aliquota_reais NUMERIC(14,4)
);

CREATE TABLE IF NOT EXISTS regra_tributaria_ipi (
  regra_tributaria_ipi_id SERIAL PRIMARY KEY,
  regra_tributaria_id INTEGER NOT NULL UNIQUE REFERENCES regra_tributaria(regra_tributaria_id) ON DELETE CASCADE,
  cst VARCHAR(2),
  enquadramento_ipi VARCHAR(3),
  aliquota NUMERIC(9,4)
);

CREATE TABLE IF NOT EXISTS nfe (
  nfe_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  empresa_tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id),
  destinatario_nome VARCHAR(180),
  destinatario_documento VARCHAR(20),
  modelo VARCHAR(2) NOT NULL DEFAULT '55',
  serie INTEGER NOT NULL,
  numero INTEGER NOT NULL,
  chave VARCHAR(44),
  natureza_operacao VARCHAR(120) NOT NULL,
  tipo_operacao VARCHAR(1) NOT NULL,
  finalidade VARCHAR(1) NOT NULL,
  ambiente VARCHAR(1) NOT NULL DEFAULT '2',
  status VARCHAR(30) NOT NULL DEFAULT 'rascunho',
  protocolo VARCHAR(30),
  recibo VARCHAR(30),
  status_sefaz VARCHAR(10),
  xml_assinado TEXT,
  xml_autorizado TEXT,
  data_autorizacao TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nfe_item (
  nfe_item_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  nfe_id INTEGER NOT NULL REFERENCES nfe(nfe_id) ON DELETE CASCADE,
  produto_id INTEGER REFERENCES produto(produto_id),
  codigo_produto VARCHAR(60) NOT NULL,
  gtin VARCHAR(20),
  gtin_tributavel VARCHAR(20),
  descricao VARCHAR(240) NOT NULL,
  ncm VARCHAR(8) NOT NULL,
  cest VARCHAR(7),
  cfop VARCHAR(4) NOT NULL,
  unidade_comercial VARCHAR(10) NOT NULL,
  quantidade_comercial NUMERIC(14,4) NOT NULL,
  valor_unitario_comercial NUMERIC(14,4) NOT NULL,
  valor_total NUMERIC(14,4) NOT NULL,
  unidade_tributavel VARCHAR(10) NOT NULL,
  quantidade_tributavel NUMERIC(14,4) NOT NULL,
  valor_unitario_tributavel NUMERIC(14,4) NOT NULL,
  valor_frete NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_seguro NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_desconto NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_outras_despesas NUMERIC(14,4) NOT NULL DEFAULT 0,
  ind_tot VARCHAR(1) NOT NULL DEFAULT '1',
  origem_mercadoria VARCHAR(1),
  cbenef VARCHAR(10),
  fci VARCHAR(36),
  informacao_adicional_item TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nfe_item_imposto (
  nfe_item_imposto_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  nfe_item_id INTEGER NOT NULL UNIQUE REFERENCES nfe_item(nfe_item_id) ON DELETE CASCADE,
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
  ipi_enquadramento VARCHAR(3)
);

CREATE INDEX IF NOT EXISTS idx_tabela_preco_tenant ON tabela_preco (tenant_id);
CREATE INDEX IF NOT EXISTS idx_deposito_tenant ON deposito (tenant_id);
CREATE INDEX IF NOT EXISTS idx_produto_tenant ON produto (tenant_id);
CREATE INDEX IF NOT EXISTS idx_produto_tenant_codigo ON produto (tenant_id, codigo_interno);
CREATE INDEX IF NOT EXISTS idx_produto_tenant_descricao ON produto (tenant_id, descricao);
CREATE INDEX IF NOT EXISTS idx_produto_preco_produto ON produto_preco (produto_id, data_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_produto_estoque_produto ON produto_estoque (produto_id);
CREATE INDEX IF NOT EXISTS idx_estoque_movimento_produto ON estoque_movimento (produto_id, data_movimento DESC);
CREATE INDEX IF NOT EXISTS idx_regra_tributaria_tenant ON regra_tributaria (tenant_id, ativo);
CREATE INDEX IF NOT EXISTS idx_nfe_tenant ON nfe (tenant_id, status);

DROP TRIGGER IF EXISTS trg_unidade_medida_updated_at ON unidade_medida;
CREATE TRIGGER trg_unidade_medida_updated_at
BEFORE UPDATE ON unidade_medida
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tabela_preco_updated_at ON tabela_preco;
CREATE TRIGGER trg_tabela_preco_updated_at
BEFORE UPDATE ON tabela_preco
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_deposito_updated_at ON deposito;
CREATE TRIGGER trg_deposito_updated_at
BEFORE UPDATE ON deposito
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_produto_updated_at ON produto;
CREATE TRIGGER trg_produto_updated_at
BEFORE UPDATE ON produto
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_produto_fiscal_updated_at ON produto_fiscal;
CREATE TRIGGER trg_produto_fiscal_updated_at
BEFORE UPDATE ON produto_fiscal
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_produto_unidade_updated_at ON produto_unidade;
CREATE TRIGGER trg_produto_unidade_updated_at
BEFORE UPDATE ON produto_unidade
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_produto_preco_updated_at ON produto_preco;
CREATE TRIGGER trg_produto_preco_updated_at
BEFORE UPDATE ON produto_preco
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_produto_estoque_updated_at ON produto_estoque;
CREATE TRIGGER trg_produto_estoque_updated_at
BEFORE UPDATE ON produto_estoque
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_regra_tributaria_updated_at ON regra_tributaria;
CREATE TRIGGER trg_regra_tributaria_updated_at
BEFORE UPDATE ON regra_tributaria
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_nfe_updated_at ON nfe;
CREATE TRIGGER trg_nfe_updated_at
BEFORE UPDATE ON nfe
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_nfe_item_updated_at ON nfe_item;
CREATE TRIGGER trg_nfe_item_updated_at
BEFORE UPDATE ON nfe_item
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

INSERT INTO unidade_medida (sigla, descricao)
VALUES
  ('UN', 'Unidade'),
  ('CX', 'Caixa'),
  ('KG', 'Quilograma'),
  ('G', 'Grama'),
  ('LT', 'Litro'),
  ('ML', 'Mililitro'),
  ('M', 'Metro'),
  ('PC', 'Pacote')
ON CONFLICT (sigla) DO UPDATE
SET
  descricao = EXCLUDED.descricao,
  ativo = TRUE;

INSERT INTO tabela_preco (tenant_id, nome, padrao, ativo, excluido)
SELECT t.tenant_id, 'Tabela Padrão', TRUE, TRUE, FALSE
FROM tenant t
WHERE NOT EXISTS (
  SELECT 1
  FROM tabela_preco tp
  WHERE tp.tenant_id = t.tenant_id
    AND tp.padrao = TRUE
    AND tp.excluido = FALSE
);

INSERT INTO deposito (tenant_id, nome, padrao, ativo, excluido)
SELECT t.tenant_id, 'Depósito Padrão', TRUE, TRUE, FALSE
FROM tenant t
WHERE NOT EXISTS (
  SELECT 1
  FROM deposito d
  WHERE d.tenant_id = t.tenant_id
    AND d.padrao = TRUE
    AND d.excluido = FALSE
);
