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
  pessoa_cliente BOOLEAN NOT NULL DEFAULT FALSE,
  pessoa_fornecedor BOOLEAN NOT NULL DEFAULT FALSE,
  pessoa_funcionario BOOLEAN NOT NULL DEFAULT FALSE,
  pessoa_transportadora BOOLEAN NOT NULL DEFAULT FALSE,
  pessoa_ativo BOOLEAN NOT NULL DEFAULT TRUE,
  pessoa_excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pessoa_tipo_check CHECK (pessoa_tipo IN ('F', 'J'))
);

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
