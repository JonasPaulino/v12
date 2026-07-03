CREATE SCHEMA IF NOT EXISTS gestao;

CREATE TABLE IF NOT EXISTS gestao.pessoa (
  pessoa_id SERIAL PRIMARY KEY,
  pessoa_tipo CHAR(1) NOT NULL DEFAULT 'F',
  nome_razao VARCHAR(180) NOT NULL,
  nome_fantasia VARCHAR(180),
  cpf_cnpj VARCHAR(14),
  pessoa_origem VARCHAR(20) NOT NULL DEFAULT 'brasil',
  documento_estrangeiro VARCHAR(80),
  pais_cadastro VARCHAR(60) NOT NULL DEFAULT 'Brasil',
  inscricao_estadual VARCHAR(30),
  inscricao_municipal VARCHAR(30),
  rg VARCHAR(30),
  email VARCHAR(150),
  telefone VARCHAR(30),
  whatsapp VARCHAR(30),
  data_nascimento DATE,
  observacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gestao_pessoa_tipo_chk CHECK (pessoa_tipo IN ('F', 'J')),
  CONSTRAINT gestao_pessoa_origem_chk CHECK (pessoa_origem IN ('brasil', 'exterior')),
  CONSTRAINT gestao_pessoa_documento_brasil_chk
    CHECK (
      pessoa_origem <> 'brasil'
      OR (cpf_cnpj IS NOT NULL AND BTRIM(cpf_cnpj) <> '')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gestao_pessoa_documento_ativo
  ON gestao.pessoa (cpf_cnpj)
  WHERE excluido = FALSE;

CREATE INDEX IF NOT EXISTS idx_gestao_pessoa_nome
  ON gestao.pessoa (nome_razao)
  WHERE excluido = FALSE;

CREATE INDEX IF NOT EXISTS idx_gestao_pessoa_origem
  ON gestao.pessoa (pessoa_origem, pais_cadastro)
  WHERE excluido = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gestao_pessoa_doc_estrangeiro_ativo
  ON gestao.pessoa (
    LOWER(COALESCE(pais_cadastro, '')),
    LOWER(COALESCE(documento_estrangeiro, ''))
  )
  WHERE excluido = FALSE
    AND pessoa_origem = 'exterior'
    AND documento_estrangeiro IS NOT NULL
    AND BTRIM(documento_estrangeiro) <> '';

CREATE TABLE IF NOT EXISTS gestao.pessoa_endereco (
  endereco_id SERIAL PRIMARY KEY,
  pessoa_id INTEGER NOT NULL REFERENCES gestao.pessoa(pessoa_id) ON DELETE CASCADE,
  endereco_tipo VARCHAR(30) NOT NULL DEFAULT 'principal',
  cep VARCHAR(10),
  logradouro VARCHAR(180),
  numero VARCHAR(30),
  complemento VARCHAR(120),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf VARCHAR(60),
  codigo_ibge VARCHAR(10),
  pais VARCHAR(60) NOT NULL DEFAULT 'Brasil',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gestao_pessoa_endereco_principal
  ON gestao.pessoa_endereco (pessoa_id, endereco_tipo);

CREATE TABLE IF NOT EXISTS gestao.usuario_interno (
  usuario_interno_id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuario(usuario_id) ON DELETE CASCADE,
  perfil VARCHAR(30) NOT NULL DEFAULT 'suporte',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gestao_usuario_perfil_chk
    CHECK (perfil IN ('admin', 'suporte', 'financeiro', 'vendedor'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gestao_usuario_interno_usuario
  ON gestao.usuario_interno (usuario_id);

CREATE TABLE IF NOT EXISTS gestao.financeiro_titulo (
  titulo_id SERIAL PRIMARY KEY,
  pessoa_id INTEGER REFERENCES gestao.pessoa(pessoa_id),
  tenant_id INTEGER REFERENCES tenant(tenant_id) ON DELETE SET NULL,
  contrato_id INTEGER REFERENCES gestao.cliente_contrato(contrato_id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'receber',
  origem VARCHAR(40) NOT NULL DEFAULT 'manual',
  descricao VARCHAR(180) NOT NULL,
  documento VARCHAR(80),
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'aberto',
  observacao TEXT,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gestao_fin_titulo_tipo_chk CHECK (tipo IN ('receber', 'pagar')),
  CONSTRAINT gestao_fin_titulo_status_chk
    CHECK (status IN ('aberto', 'parcial', 'quitado', 'cancelado', 'vencido'))
);

CREATE INDEX IF NOT EXISTS idx_gestao_fin_titulo_status
  ON gestao.financeiro_titulo (tipo, status, data_emissao DESC)
  WHERE excluido = FALSE;

CREATE TABLE IF NOT EXISTS gestao.financeiro_parcela (
  parcela_id SERIAL PRIMARY KEY,
  titulo_id INTEGER NOT NULL REFERENCES gestao.financeiro_titulo(titulo_id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_pago NUMERIC(14,2) NOT NULL DEFAULT 0,
  vencimento DATE NOT NULL,
  pagamento_em DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'aberto',
  asaas_charge_id VARCHAR(120),
  asaas_invoice_url TEXT,
  asaas_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gestao_fin_parcela_status_chk
    CHECK (status IN ('aberto', 'parcial', 'quitado', 'cancelado', 'vencido')),
  CONSTRAINT gestao_fin_parcela_numero_chk CHECK (numero_parcela > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gestao_fin_parcela_titulo_numero
  ON gestao.financeiro_parcela (titulo_id, numero_parcela);

CREATE INDEX IF NOT EXISTS idx_gestao_fin_parcela_status
  ON gestao.financeiro_parcela (status, vencimento);

CREATE TABLE IF NOT EXISTS gestao.configuracao (
  chave VARCHAR(80) PRIMARY KEY,
  valor_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  descricao TEXT,
  atualizado_por INTEGER REFERENCES usuario(usuario_id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_gestao_pessoa_updated_at ON gestao.pessoa;
CREATE TRIGGER trg_gestao_pessoa_updated_at
BEFORE UPDATE ON gestao.pessoa
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_gestao_pessoa_endereco_updated_at ON gestao.pessoa_endereco;
CREATE TRIGGER trg_gestao_pessoa_endereco_updated_at
BEFORE UPDATE ON gestao.pessoa_endereco
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_gestao_usuario_interno_updated_at ON gestao.usuario_interno;
CREATE TRIGGER trg_gestao_usuario_interno_updated_at
BEFORE UPDATE ON gestao.usuario_interno
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_gestao_fin_titulo_updated_at ON gestao.financeiro_titulo;
CREATE TRIGGER trg_gestao_fin_titulo_updated_at
BEFORE UPDATE ON gestao.financeiro_titulo
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_gestao_fin_parcela_updated_at ON gestao.financeiro_parcela;
CREATE TRIGGER trg_gestao_fin_parcela_updated_at
BEFORE UPDATE ON gestao.financeiro_parcela
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_gestao_configuracao_updated_at ON gestao.configuracao;
CREATE TRIGGER trg_gestao_configuracao_updated_at
BEFORE UPDATE ON gestao.configuracao
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
