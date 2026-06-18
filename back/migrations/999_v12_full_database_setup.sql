-- Script mestre consolidado do banco V12
-- Pode ser executado diretamente no DBeaver ou via psql
-- Conteudo expandido das migrations atuais do projeto


-- =====================================================================
-- 001_base_schema.sql
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS tenant (
  tenant_id SERIAL PRIMARY KEY,
  tenant_nome VARCHAR(150) NOT NULL,
  tenant_slug VARCHAR(80) NOT NULL UNIQUE,
  tenant_documento VARCHAR(20),
  tenant_ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuario (
  usuario_id SERIAL PRIMARY KEY,
  tenant_id_default INTEGER REFERENCES tenant(tenant_id),
  usuario_nome VARCHAR(150) NOT NULL,
  usuario_email VARCHAR(150) NOT NULL UNIQUE,
  usuario_username VARCHAR(80) NOT NULL UNIQUE,
  usuario_senha TEXT NOT NULL,
  usuario_ativo BOOLEAN NOT NULL DEFAULT TRUE,
  usuario_primeiro_login BOOLEAN NOT NULL DEFAULT FALSE,
  usuario_excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuario_tenant (
  usuario_tenant_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuario(usuario_id) ON DELETE CASCADE,
  perfil VARCHAR(40) NOT NULL DEFAULT 'admin',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_acesso_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS usuario_sessao (
  usuario_sessao_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuario(usuario_id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  dispositivo TEXT,
  ip TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuario_tenant_usuario ON usuario_tenant (usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_tenant_tenant ON usuario_tenant (tenant_id);
CREATE INDEX IF NOT EXISTS idx_usuario_sessao_usuario ON usuario_sessao (usuario_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_usuario_sessao_tenant ON usuario_sessao (tenant_id);

DROP TRIGGER IF EXISTS trg_tenant_updated_at ON tenant;
CREATE TRIGGER trg_tenant_updated_at
BEFORE UPDATE ON tenant
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_usuario_updated_at ON usuario;
CREATE TRIGGER trg_usuario_updated_at
BEFORE UPDATE ON usuario
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE usuario_tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_sessao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuario_tenant_rls ON usuario_tenant;
CREATE POLICY usuario_tenant_rls ON usuario_tenant
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS usuario_sessao_rls ON usuario_sessao;
CREATE POLICY usuario_sessao_rls ON usuario_sessao
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

INSERT INTO tenant (tenant_id, tenant_nome, tenant_slug, tenant_documento, tenant_ativo)
VALUES
  (1, 'Filial Centro', 'filial-centro', '00.000.000/0001-01', TRUE),
  (2, 'Filial Norte', 'filial-norte', '00.000.000/0001-02', TRUE)
ON CONFLICT (tenant_id) DO UPDATE
SET
  tenant_nome = EXCLUDED.tenant_nome,
  tenant_slug = EXCLUDED.tenant_slug,
  tenant_documento = EXCLUDED.tenant_documento,
  tenant_ativo = EXCLUDED.tenant_ativo;

SELECT setval('tenant_tenant_id_seq', GREATEST((SELECT MAX(tenant_id) FROM tenant), 1));

INSERT INTO usuario (
  usuario_id,
  tenant_id_default,
  usuario_nome,
  usuario_email,
  usuario_username,
  usuario_senha,
  usuario_ativo,
  usuario_primeiro_login,
  usuario_excluido
)
VALUES (
  1,
  1,
  'Administrador V12',
  'admin@v12.local',
  'admin',
  'bb2b300980ff06682bdb5bda17ef587e:6c28bec61302bff32f0926e2136d580530e711c6c1772aadd8f9d53c5fc0b1c85c05216350fc998ba9149c6c0a0de656167f10cd2cdde834b3a583f05b678cb3',
  TRUE,
  FALSE,
  FALSE
)
ON CONFLICT (usuario_id) DO UPDATE
SET
  tenant_id_default = EXCLUDED.tenant_id_default,
  usuario_nome = EXCLUDED.usuario_nome,
  usuario_email = EXCLUDED.usuario_email,
  usuario_username = EXCLUDED.usuario_username,
  usuario_senha = EXCLUDED.usuario_senha,
  usuario_ativo = EXCLUDED.usuario_ativo,
  usuario_primeiro_login = EXCLUDED.usuario_primeiro_login,
  usuario_excluido = EXCLUDED.usuario_excluido;

SELECT setval('usuario_usuario_id_seq', GREATEST((SELECT MAX(usuario_id) FROM usuario), 1));

INSERT INTO usuario_tenant (tenant_id, usuario_id, perfil, ativo, ultimo_acesso_em)
VALUES
  (1, 1, 'admin', TRUE, NOW()),
  (2, 1, 'admin', TRUE, NOW())
ON CONFLICT (tenant_id, usuario_id) DO UPDATE
SET
  perfil = EXCLUDED.perfil,
  ativo = EXCLUDED.ativo;


-- =====================================================================
-- 002_usuario_gestao.sql
-- =====================================================================
ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS usuario_primeiro_login BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS usuario_excluido BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE usuario
SET
  usuario_primeiro_login = COALESCE(usuario_primeiro_login, FALSE),
  usuario_excluido = COALESCE(usuario_excluido, FALSE);


-- =====================================================================
-- 003_produtos_nfe_base.sql
-- =====================================================================
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
  casas_decimais_comercial SMALLINT NOT NULL DEFAULT 4,
  casas_decimais_tributavel SMALLINT NOT NULL DEFAULT 4,
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


-- =====================================================================
-- 004_pessoa_base.sql
-- =====================================================================
CREATE TABLE IF NOT EXISTS pessoa (
  pessoa_id SERIAL PRIMARY KEY,
  pessoa_tipo CHAR(1) NOT NULL DEFAULT 'F',
  pessoa_nome_razao VARCHAR(180) NOT NULL,
  pessoa_nome_fantasia VARCHAR(180),
  pessoa_cpf_cnpj VARCHAR(20),
  pessoa_inscricao_estadual VARCHAR(20),
  pessoa_inscricao_municipal VARCHAR(20),
  pessoa_rg VARCHAR(20),
  pessoa_email VARCHAR(150),
  pessoa_telefone VARCHAR(20),
  pessoa_whatsapp VARCHAR(20),
  pessoa_data_nascimento DATE,
  pessoa_observacao TEXT,
  pessoa_ativo BOOLEAN NOT NULL DEFAULT TRUE,
  pessoa_excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pessoa_tipo_check CHECK (pessoa_tipo IN ('F', 'J'))
);

ALTER TABLE pessoa DROP COLUMN IF EXISTS pessoa_cliente;
ALTER TABLE pessoa DROP COLUMN IF EXISTS pessoa_fornecedor;
ALTER TABLE pessoa DROP COLUMN IF EXISTS pessoa_funcionario;
ALTER TABLE pessoa DROP COLUMN IF EXISTS pessoa_transportadora;

CREATE TABLE IF NOT EXISTS pessoa_tenant (
  pessoa_tenant_id SERIAL PRIMARY KEY,
  pessoa_id INTEGER NOT NULL REFERENCES pessoa(pessoa_id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  principal BOOLEAN NOT NULL DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pessoa_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS pessoa_endereco (
  pessoa_endereco_id SERIAL PRIMARY KEY,
  pessoa_id INTEGER NOT NULL REFERENCES pessoa(pessoa_id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  endereco_tipo VARCHAR(30) NOT NULL DEFAULT 'principal',
  cep VARCHAR(9),
  logradouro VARCHAR(180),
  numero VARCHAR(20),
  complemento VARCHAR(120),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf CHAR(2),
  codigo_ibge VARCHAR(10),
  pais VARCHAR(60) NOT NULL DEFAULT 'Brasil',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pessoa_id, tenant_id, endereco_tipo)
);

ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS pessoa_id INTEGER REFERENCES pessoa(pessoa_id);

ALTER TABLE tenant
  ADD COLUMN IF NOT EXISTS pessoa_id INTEGER REFERENCES pessoa(pessoa_id);

CREATE INDEX IF NOT EXISTS idx_pessoa_nome_razao ON pessoa (pessoa_nome_razao);
CREATE INDEX IF NOT EXISTS idx_pessoa_email ON pessoa (pessoa_email);
CREATE INDEX IF NOT EXISTS idx_pessoa_tenant_tenant ON pessoa_tenant (tenant_id, ativo);
CREATE INDEX IF NOT EXISTS idx_pessoa_tenant_pessoa ON pessoa_tenant (pessoa_id, ativo);
CREATE INDEX IF NOT EXISTS idx_pessoa_endereco_tenant ON pessoa_endereco (tenant_id, pessoa_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pessoa_cpf_cnpj_unico
  ON pessoa ((REGEXP_REPLACE(COALESCE(pessoa_cpf_cnpj, ''), '\D', '', 'g')))
  WHERE pessoa_excluido = FALSE
    AND pessoa_cpf_cnpj IS NOT NULL
    AND BTRIM(pessoa_cpf_cnpj) <> '';

DROP TRIGGER IF EXISTS trg_pessoa_updated_at ON pessoa;
CREATE TRIGGER trg_pessoa_updated_at
BEFORE UPDATE ON pessoa
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_pessoa_endereco_updated_at ON pessoa_endereco;
CREATE TRIGGER trg_pessoa_endereco_updated_at
BEFORE UPDATE ON pessoa_endereco
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE pessoa_tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE pessoa_endereco ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pessoa_tenant_rls ON pessoa_tenant;
CREATE POLICY pessoa_tenant_rls ON pessoa_tenant
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS pessoa_endereco_rls ON pessoa_endereco;
CREATE POLICY pessoa_endereco_rls ON pessoa_endereco
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);


-- =====================================================================
-- 005_vendas_financeiro_base.sql
-- =====================================================================
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
  TRUE,
  seed.padrao
FROM tenant t
CROSS JOIN (
  VALUES
    ('A vista', 'receber', 1, 0, 30, 0::numeric, TRUE),
    ('30 dias', 'receber', 1, 30, 30, 0::numeric, FALSE),
    ('2x 30/60', 'receber', 2, 30, 30, 0::numeric, FALSE),
    ('3x 30/60/90', 'receber', 3, 30, 30, 0::numeric, FALSE),
    ('A vista fornecedor', 'pagar', 1, 0, 30, 0::numeric, FALSE)
) AS seed(descricao, tipo, quantidade_parcelas, dias_primeiro_vencimento, intervalo_dias, percentual_entrada, padrao)
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
  ordem
)
SELECT
  t.tenant_id,
  seed.descricao,
  seed.tipo,
  TRUE,
  seed.padrao,
  seed.ordem
FROM tenant t
CROSS JOIN (
  VALUES
    ('Dinheiro', 'ambos', TRUE, 1),
    ('Pix', 'ambos', FALSE, 2),
    ('Cartao de debito', 'receber', FALSE, 3),
    ('Cartao de credito', 'receber', FALSE, 4),
    ('Transferencia', 'ambos', FALSE, 5),
    ('Boleto', 'receber', FALSE, 6)
) AS seed(descricao, tipo, padrao, ordem)
WHERE NOT EXISTS (
  SELECT 1
  FROM financeiro_forma_pagamento fp
  WHERE fp.tenant_id = t.tenant_id
);


-- =====================================================================
-- 006_produto_codigo_automatico.sql
-- =====================================================================
ALTER TABLE produto
  ALTER COLUMN codigo_interno DROP NOT NULL;

UPDATE produto
SET codigo_interno = produto_id::VARCHAR(60)
WHERE codigo_interno IS NULL
   OR BTRIM(codigo_interno) = ''
   OR codigo_interno <> produto_id::VARCHAR(60);


-- =====================================================================
-- 007_unaccent_support.sql
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS unaccent;


-- =====================================================================
-- 008_configuracao_fiscal.sql
-- =====================================================================
CREATE TABLE IF NOT EXISTS tenant_configuracao_fiscal (
  tenant_id INTEGER PRIMARY KEY REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  ambiente_nfe VARCHAR(1) NOT NULL DEFAULT '2'
    CHECK (ambiente_nfe IN ('1', '2')),
  serie_nfe_padrao INTEGER NOT NULL DEFAULT 1,
  proximo_numero_nfe INTEGER NOT NULL DEFAULT 1,
  crt VARCHAR(1) NOT NULL DEFAULT '3'
    CHECK (crt IN ('1', '2', '3')),
  cnae VARCHAR(7),
  natureza_operacao_padrao VARCHAR(120),
  nfe_habilitada BOOLEAN NOT NULL DEFAULT FALSE,
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_certificado_a1 (
  tenant_id INTEGER PRIMARY KEY REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  nome_arquivo VARCHAR(180),
  conteudo_pfx BYTEA,
  senha_criptografada TEXT,
  tamanho_arquivo INTEGER,
  importado_em TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_configuracao_fiscal_habilitada
  ON tenant_configuracao_fiscal (nfe_habilitada, ambiente_nfe);

DROP TRIGGER IF EXISTS trg_tenant_configuracao_fiscal_updated_at ON tenant_configuracao_fiscal;
CREATE TRIGGER trg_tenant_configuracao_fiscal_updated_at
BEFORE UPDATE ON tenant_configuracao_fiscal
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tenant_certificado_a1_updated_at ON tenant_certificado_a1;
CREATE TRIGGER trg_tenant_certificado_a1_updated_at
BEFORE UPDATE ON tenant_certificado_a1
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE tenant_configuracao_fiscal ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_certificado_a1 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_configuracao_fiscal_rls ON tenant_configuracao_fiscal;
CREATE POLICY tenant_configuracao_fiscal_rls ON tenant_configuracao_fiscal
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS tenant_certificado_a1_rls ON tenant_certificado_a1;
CREATE POLICY tenant_certificado_a1_rls ON tenant_certificado_a1
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

INSERT INTO tenant_configuracao_fiscal (
  tenant_id,
  ambiente_nfe,
  serie_nfe_padrao,
  proximo_numero_nfe,
  crt,
  natureza_operacao_padrao,
  nfe_habilitada
)
SELECT
  t.tenant_id,
  '2',
  1,
  1,
  '3',
  'Venda de mercadoria',
  FALSE
FROM tenant t
WHERE NOT EXISTS (
  SELECT 1
  FROM tenant_configuracao_fiscal cfg
  WHERE cfg.tenant_id = t.tenant_id
);


-- =====================================================================
-- 009_financeiro_baixa_historico.sql
-- =====================================================================
ALTER TABLE financeiro_titulo_baixa
  ADD COLUMN IF NOT EXISTS usuario_baixa_id INTEGER REFERENCES usuario(usuario_id) ON DELETE SET NULL;

ALTER TABLE financeiro_titulo_baixa
  ADD COLUMN IF NOT EXISTS usuario_estorno_id INTEGER REFERENCES usuario(usuario_id) ON DELETE SET NULL;

ALTER TABLE financeiro_titulo_baixa
  ADD COLUMN IF NOT EXISTS estornado_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_fin_titulo_baixa_usuario_baixa
  ON financeiro_titulo_baixa (usuario_baixa_id);

CREATE INDEX IF NOT EXISTS idx_fin_titulo_baixa_usuario_estorno
  ON financeiro_titulo_baixa (usuario_estorno_id);


-- =====================================================================
-- 010_configuracao_gateway.sql
-- =====================================================================
  CREATE SCHEMA IF NOT EXISTS payments;

  CREATE TABLE IF NOT EXISTS payments.tenant_configuracao_gateway (
    tenant_id INTEGER PRIMARY KEY REFERENCES tenant(tenant_id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL DEFAULT 'asaas'
      CHECK (provider IN ('asaas')),
    ambiente VARCHAR(20) NOT NULL DEFAULT 'sandbox'
      CHECK (ambiente IN ('sandbox', 'production')),
    wallet_id VARCHAR(120),
    api_key_criptografada TEXT,
    api_key_masked VARCHAR(80),
    webhook_auth_token_criptografada TEXT,
    webhook_auth_token_masked VARCHAR(80),
    gateway_ativo BOOLEAN NOT NULL DEFAULT FALSE,
    auto_criar_cliente BOOLEAN NOT NULL DEFAULT TRUE,
    baixa_automatica_pix BOOLEAN NOT NULL DEFAULT TRUE,
    baixa_automatica_boleto BOOLEAN NOT NULL DEFAULT TRUE,
    observacao TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_tenant_configuracao_gateway_provider
    ON payments.tenant_configuracao_gateway (provider, ambiente, gateway_ativo);

  DROP TRIGGER IF EXISTS trg_tenant_configuracao_gateway_updated_at ON payments.tenant_configuracao_gateway;
  CREATE TRIGGER trg_tenant_configuracao_gateway_updated_at
  BEFORE UPDATE ON payments.tenant_configuracao_gateway
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

  ALTER TABLE payments.tenant_configuracao_gateway ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS tenant_configuracao_gateway_rls ON payments.tenant_configuracao_gateway;
  CREATE POLICY tenant_configuracao_gateway_rls ON payments.tenant_configuracao_gateway
    USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

  INSERT INTO payments.tenant_configuracao_gateway (
    tenant_id,
    provider,
    ambiente,
    gateway_ativo,
    auto_criar_cliente,
    baixa_automatica_pix,
    baixa_automatica_boleto
  )
  SELECT
    t.tenant_id,
    'asaas',
    'sandbox',
    FALSE,
    TRUE,
    TRUE,
    TRUE
  FROM tenant t
  WHERE NOT EXISTS (
    SELECT 1
    FROM payments.tenant_configuracao_gateway cfg
    WHERE cfg.tenant_id = t.tenant_id
  );


-- =====================================================================
-- 011_gateway_config_payments_schema.sql
-- =====================================================================
CREATE SCHEMA IF NOT EXISTS payments;

CREATE TABLE IF NOT EXISTS payments.tenant_configuracao_gateway (
  tenant_id INTEGER PRIMARY KEY REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL DEFAULT 'asaas'
    CHECK (provider IN ('asaas')),
  ambiente VARCHAR(20) NOT NULL DEFAULT 'sandbox'
    CHECK (ambiente IN ('sandbox', 'production')),
  wallet_id VARCHAR(120),
  api_key_criptografada TEXT,
  api_key_masked VARCHAR(80),
  webhook_auth_token_criptografada TEXT,
  webhook_auth_token_masked VARCHAR(80),
  gateway_ativo BOOLEAN NOT NULL DEFAULT FALSE,
  auto_criar_cliente BOOLEAN NOT NULL DEFAULT TRUE,
  baixa_automatica_pix BOOLEAN NOT NULL DEFAULT TRUE,
  baixa_automatica_boleto BOOLEAN NOT NULL DEFAULT TRUE,
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_configuracao_gateway_provider
  ON payments.tenant_configuracao_gateway (provider, ambiente, gateway_ativo);

DROP TRIGGER IF EXISTS trg_tenant_configuracao_gateway_updated_at ON payments.tenant_configuracao_gateway;
CREATE TRIGGER trg_tenant_configuracao_gateway_updated_at
BEFORE UPDATE ON payments.tenant_configuracao_gateway
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE payments.tenant_configuracao_gateway ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_configuracao_gateway_rls ON payments.tenant_configuracao_gateway;
CREATE POLICY tenant_configuracao_gateway_rls ON payments.tenant_configuracao_gateway
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'tenant_configuracao_gateway'
  ) THEN
    INSERT INTO payments.tenant_configuracao_gateway (
      tenant_id,
      provider,
      ambiente,
      wallet_id,
      api_key_criptografada,
      api_key_masked,
      webhook_auth_token_criptografada,
      webhook_auth_token_masked,
      gateway_ativo,
      auto_criar_cliente,
      baixa_automatica_pix,
      baixa_automatica_boleto,
      observacao,
      criado_em,
      atualizado_em
    )
    SELECT
      tenant_id,
      provider,
      ambiente,
      wallet_id,
      api_key_criptografada,
      api_key_masked,
      webhook_auth_token_criptografada,
      webhook_auth_token_masked,
      gateway_ativo,
      auto_criar_cliente,
      baixa_automatica_pix,
      baixa_automatica_boleto,
      observacao,
      criado_em,
      atualizado_em
    FROM public.tenant_configuracao_gateway
    ON CONFLICT (tenant_id) DO UPDATE
    SET
      provider = EXCLUDED.provider,
      ambiente = EXCLUDED.ambiente,
      wallet_id = EXCLUDED.wallet_id,
      api_key_criptografada = EXCLUDED.api_key_criptografada,
      api_key_masked = EXCLUDED.api_key_masked,
      webhook_auth_token_criptografada = EXCLUDED.webhook_auth_token_criptografada,
      webhook_auth_token_masked = EXCLUDED.webhook_auth_token_masked,
      gateway_ativo = EXCLUDED.gateway_ativo,
      auto_criar_cliente = EXCLUDED.auto_criar_cliente,
      baixa_automatica_pix = EXCLUDED.baixa_automatica_pix,
      baixa_automatica_boleto = EXCLUDED.baixa_automatica_boleto,
      observacao = EXCLUDED.observacao,
      criado_em = EXCLUDED.criado_em,
      atualizado_em = EXCLUDED.atualizado_em;
  END IF;
END $$;

INSERT INTO payments.tenant_configuracao_gateway (
  tenant_id,
  provider,
  ambiente,
  gateway_ativo,
  auto_criar_cliente,
  baixa_automatica_pix,
  baixa_automatica_boleto
)
SELECT
  t.tenant_id,
  'asaas',
  'sandbox',
  FALSE,
  TRUE,
  TRUE,
  TRUE
FROM tenant t
WHERE NOT EXISTS (
  SELECT 1
  FROM payments.tenant_configuracao_gateway cfg
  WHERE cfg.tenant_id = t.tenant_id
);


-- =====================================================================
-- 001_payments_schema.sql
-- =====================================================================
CREATE SCHEMA IF NOT EXISTS payments;

CREATE TABLE IF NOT EXISTS payments.gateway_customer (
  gateway_customer_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  provider VARCHAR(30) NOT NULL,
  pessoa_id INTEGER NOT NULL,
  external_customer_id VARCHAR(80) NOT NULL,
  external_reference VARCHAR(120),
  nome VARCHAR(180) NOT NULL,
  documento VARCHAR(20),
  payload JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, provider, pessoa_id),
  UNIQUE (provider, external_customer_id)
);

CREATE TABLE IF NOT EXISTS payments.gateway_charge (
  gateway_charge_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  provider VARCHAR(30) NOT NULL,
  financeiro_titulo_id INTEGER NOT NULL,
  financeiro_titulo_parcela_id INTEGER,
  financeiro_forma_pagamento_id INTEGER,
  pessoa_id INTEGER NOT NULL,
  external_charge_id VARCHAR(80) NOT NULL,
  external_customer_id VARCHAR(80) NOT NULL,
  external_reference VARCHAR(160) NOT NULL,
  billing_type VARCHAR(20) NOT NULL,
  status VARCHAR(40) NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  invoice_url TEXT,
  pix_payload TEXT,
  pix_encoded_image TEXT,
  pix_expiration_date TIMESTAMPTZ,
  settled BOOLEAN NOT NULL DEFAULT FALSE,
  settled_at TIMESTAMPTZ,
  payload JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, external_charge_id),
  UNIQUE (provider, external_reference)
);

CREATE TABLE IF NOT EXISTS payments.gateway_event (
  gateway_event_id SERIAL PRIMARY KEY,
  tenant_id INTEGER,
  provider VARCHAR(30) NOT NULL,
  external_event_id VARCHAR(120) NOT NULL,
  external_charge_id VARCHAR(80),
  event_name VARCHAR(80) NOT NULL,
  payload JSONB,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE (provider, external_event_id)
);

CREATE INDEX IF NOT EXISTS idx_gateway_customer_tenant
  ON payments.gateway_customer (tenant_id, provider, pessoa_id);

CREATE INDEX IF NOT EXISTS idx_gateway_charge_tenant
  ON payments.gateway_charge (tenant_id, provider, financeiro_titulo_id, settled);

CREATE INDEX IF NOT EXISTS idx_gateway_charge_external
  ON payments.gateway_charge (provider, external_charge_id);

CREATE INDEX IF NOT EXISTS idx_gateway_event_charge
  ON payments.gateway_event (provider, external_charge_id, processed);

DROP TRIGGER IF EXISTS trg_gateway_customer_updated_at ON payments.gateway_customer;
CREATE TRIGGER trg_gateway_customer_updated_at
BEFORE UPDATE ON payments.gateway_customer
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_gateway_charge_updated_at ON payments.gateway_charge;
CREATE TRIGGER trg_gateway_charge_updated_at
BEFORE UPDATE ON payments.gateway_charge
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

