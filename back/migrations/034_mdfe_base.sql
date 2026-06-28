CREATE SCHEMA IF NOT EXISTS fiscal;

CREATE TABLE IF NOT EXISTS fiscal.mdfe_veiculo (
  mdfe_veiculo_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  proprietario_pessoa_id INTEGER REFERENCES pessoa(pessoa_id) ON DELETE SET NULL,
  placa VARCHAR(7) NOT NULL,
  renavam VARCHAR(11),
  uf CHAR(2) NOT NULL,
  tara_kg NUMERIC(14,4) NOT NULL DEFAULT 0,
  capacidade_kg NUMERIC(14,4) NOT NULL DEFAULT 0,
  capacidade_m3 NUMERIC(14,4) NOT NULL DEFAULT 0,
  tipo_rodado VARCHAR(2) NOT NULL DEFAULT '01',
  tipo_carroceria VARCHAR(2) NOT NULL DEFAULT '00',
  tipo_proprietario VARCHAR(2),
  rntrc VARCHAR(8),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mdfe_veiculo_placa_len CHECK (LENGTH(REGEXP_REPLACE(placa, '[^A-Z0-9]', '', 'g')) = 7)
);

CREATE TABLE IF NOT EXISTS fiscal.mdfe_motorista (
  mdfe_motorista_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  pessoa_id INTEGER REFERENCES pessoa(pessoa_id) ON DELETE SET NULL,
  nome VARCHAR(180) NOT NULL,
  cpf VARCHAR(11) NOT NULL,
  cnh VARCHAR(20),
  telefone VARCHAR(20),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mdfe_motorista_cpf_len CHECK (LENGTH(cpf) = 11)
);

CREATE TABLE IF NOT EXISTS fiscal.mdfe_seguradora (
  mdfe_seguradora_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  pessoa_id INTEGER REFERENCES pessoa(pessoa_id) ON DELETE SET NULL,
  nome VARCHAR(180) NOT NULL,
  cnpj VARCHAR(14) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mdfe_seguradora_cnpj_len CHECK (LENGTH(cnpj) = 14)
);

CREATE TABLE IF NOT EXISTS fiscal.mdfe (
  mdfe_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuario(usuario_id) ON DELETE SET NULL,
  emitente_pessoa_id INTEGER REFERENCES pessoa(pessoa_id) ON DELETE SET NULL,
  veiculo_tracao_id INTEGER REFERENCES fiscal.mdfe_veiculo(mdfe_veiculo_id) ON DELETE SET NULL,
  serie INTEGER NOT NULL DEFAULT 1,
  numero INTEGER,
  ambiente VARCHAR(1) NOT NULL DEFAULT '2',
  tipo_emitente VARCHAR(1) NOT NULL DEFAULT '2',
  modal VARCHAR(2) NOT NULL DEFAULT '1',
  tipo_transportador VARCHAR(1),
  uf_inicio CHAR(2) NOT NULL,
  uf_fim CHAR(2) NOT NULL,
  municipio_carregamento_codigo VARCHAR(7) NOT NULL,
  municipio_carregamento_nome VARCHAR(100) NOT NULL,
  municipio_encerramento_codigo VARCHAR(7),
  municipio_encerramento_nome VARCHAR(100),
  uf_encerramento CHAR(2),
  data_emissao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_encerramento TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'validado', 'autorizado', 'cancelado', 'encerrado', 'rejeitado')),
  chave_acesso VARCHAR(44),
  protocolo VARCHAR(30),
  recibo VARCHAR(30),
  valor_total_carga NUMERIC(14,2) NOT NULL DEFAULT 0,
  peso_bruto_kg NUMERIC(14,4) NOT NULL DEFAULT 0,
  quantidade_documentos INTEGER NOT NULL DEFAULT 0,
  observacao TEXT,
  xml_assinado TEXT,
  xml_autorizado TEXT,
  damdfe_path TEXT,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal.mdfe_reboque (
  mdfe_reboque_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  mdfe_id INTEGER NOT NULL REFERENCES fiscal.mdfe(mdfe_id) ON DELETE CASCADE,
  veiculo_id INTEGER NOT NULL REFERENCES fiscal.mdfe_veiculo(mdfe_veiculo_id),
  ordem INTEGER NOT NULL DEFAULT 1,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mdfe_id, veiculo_id)
);

CREATE TABLE IF NOT EXISTS fiscal.mdfe_condutor (
  mdfe_condutor_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  mdfe_id INTEGER NOT NULL REFERENCES fiscal.mdfe(mdfe_id) ON DELETE CASCADE,
  motorista_id INTEGER NOT NULL REFERENCES fiscal.mdfe_motorista(mdfe_motorista_id),
  principal BOOLEAN NOT NULL DEFAULT FALSE,
  ordem INTEGER NOT NULL DEFAULT 1,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mdfe_id, motorista_id)
);

CREATE TABLE IF NOT EXISTS fiscal.mdfe_percurso (
  mdfe_percurso_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  mdfe_id INTEGER NOT NULL REFERENCES fiscal.mdfe(mdfe_id) ON DELETE CASCADE,
  uf CHAR(2) NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 1,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal.mdfe_descarga (
  mdfe_descarga_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  mdfe_id INTEGER NOT NULL REFERENCES fiscal.mdfe(mdfe_id) ON DELETE CASCADE,
  municipio_codigo VARCHAR(7) NOT NULL,
  municipio_nome VARCHAR(100) NOT NULL,
  uf CHAR(2),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal.mdfe_documento (
  mdfe_documento_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  mdfe_id INTEGER NOT NULL REFERENCES fiscal.mdfe(mdfe_id) ON DELETE CASCADE,
  nfe_id INTEGER REFERENCES fiscal.nfe(nfe_id) ON DELETE SET NULL,
  tipo_documento VARCHAR(10) NOT NULL DEFAULT 'nfe'
    CHECK (tipo_documento IN ('nfe', 'cte')),
  chave_acesso VARCHAR(44) NOT NULL,
  valor_documento NUMERIC(14,2) NOT NULL DEFAULT 0,
  peso_kg NUMERIC(14,4) NOT NULL DEFAULT 0,
  municipio_descarga_codigo VARCHAR(7),
  municipio_descarga_nome VARCHAR(100),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mdfe_id, chave_acesso)
);

CREATE TABLE IF NOT EXISTS fiscal.mdfe_seguro (
  mdfe_seguro_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  mdfe_id INTEGER NOT NULL REFERENCES fiscal.mdfe(mdfe_id) ON DELETE CASCADE,
  seguradora_id INTEGER REFERENCES fiscal.mdfe_seguradora(mdfe_seguradora_id) ON DELETE SET NULL,
  responsavel_seguro VARCHAR(1),
  cnpj_responsavel VARCHAR(14),
  cpf_responsavel VARCHAR(11),
  numero_apolice VARCHAR(40),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal.mdfe_seguro_averbacao (
  mdfe_seguro_averbacao_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  mdfe_seguro_id INTEGER NOT NULL REFERENCES fiscal.mdfe_seguro(mdfe_seguro_id) ON DELETE CASCADE,
  numero_averbacao VARCHAR(40) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal.mdfe_ciot (
  mdfe_ciot_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  mdfe_id INTEGER NOT NULL REFERENCES fiscal.mdfe(mdfe_id) ON DELETE CASCADE,
  ciot VARCHAR(12) NOT NULL,
  cpf_cnpj_responsavel VARCHAR(14) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal.mdfe_evento (
  mdfe_evento_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  mdfe_id INTEGER NOT NULL REFERENCES fiscal.mdfe(mdfe_id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuario(usuario_id) ON DELETE SET NULL,
  tipo_evento VARCHAR(80) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pendente',
  protocolo VARCHAR(30),
  mensagem TEXT,
  payload_json JSONB,
  resposta_json JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal.mdfe_xml (
  mdfe_xml_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  mdfe_id INTEGER NOT NULL REFERENCES fiscal.mdfe(mdfe_id) ON DELETE CASCADE,
  tipo_xml VARCHAR(30) NOT NULL,
  conteudo_xml TEXT NOT NULL,
  hash_sha256 VARCHAR(64),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mdfe_veiculo_placa_tenant
  ON fiscal.mdfe_veiculo (tenant_id, placa)
  WHERE excluido = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mdfe_motorista_cpf_tenant
  ON fiscal.mdfe_motorista (tenant_id, cpf)
  WHERE excluido = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mdfe_seguradora_cnpj_tenant
  ON fiscal.mdfe_seguradora (tenant_id, cnpj)
  WHERE excluido = FALSE;

CREATE INDEX IF NOT EXISTS idx_mdfe_tenant_status
  ON fiscal.mdfe (tenant_id, status, data_emissao DESC)
  WHERE excluido = FALSE;

CREATE INDEX IF NOT EXISTS idx_mdfe_chave
  ON fiscal.mdfe (chave_acesso);

CREATE INDEX IF NOT EXISTS idx_mdfe_documento_mdfe
  ON fiscal.mdfe_documento (mdfe_id);

CREATE INDEX IF NOT EXISTS idx_mdfe_evento_mdfe
  ON fiscal.mdfe_evento (mdfe_id, criado_em DESC);

DROP TRIGGER IF EXISTS trg_mdfe_veiculo_updated_at ON fiscal.mdfe_veiculo;
CREATE TRIGGER trg_mdfe_veiculo_updated_at
BEFORE UPDATE ON fiscal.mdfe_veiculo
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_mdfe_motorista_updated_at ON fiscal.mdfe_motorista;
CREATE TRIGGER trg_mdfe_motorista_updated_at
BEFORE UPDATE ON fiscal.mdfe_motorista
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_mdfe_seguradora_updated_at ON fiscal.mdfe_seguradora;
CREATE TRIGGER trg_mdfe_seguradora_updated_at
BEFORE UPDATE ON fiscal.mdfe_seguradora
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_mdfe_updated_at ON fiscal.mdfe;
CREATE TRIGGER trg_mdfe_updated_at
BEFORE UPDATE ON fiscal.mdfe
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_mdfe_evento_updated_at ON fiscal.mdfe_evento;
CREATE TRIGGER trg_mdfe_evento_updated_at
BEFORE UPDATE ON fiscal.mdfe_evento
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE fiscal.mdfe_veiculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.mdfe_motorista ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.mdfe_seguradora ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.mdfe ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.mdfe_reboque ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.mdfe_condutor ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.mdfe_percurso ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.mdfe_descarga ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.mdfe_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.mdfe_seguro ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.mdfe_seguro_averbacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.mdfe_ciot ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.mdfe_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.mdfe_xml ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mdfe_veiculo_rls ON fiscal.mdfe_veiculo;
CREATE POLICY mdfe_veiculo_rls ON fiscal.mdfe_veiculo
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS mdfe_motorista_rls ON fiscal.mdfe_motorista;
CREATE POLICY mdfe_motorista_rls ON fiscal.mdfe_motorista
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS mdfe_seguradora_rls ON fiscal.mdfe_seguradora;
CREATE POLICY mdfe_seguradora_rls ON fiscal.mdfe_seguradora
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS mdfe_rls ON fiscal.mdfe;
CREATE POLICY mdfe_rls ON fiscal.mdfe
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS mdfe_reboque_rls ON fiscal.mdfe_reboque;
CREATE POLICY mdfe_reboque_rls ON fiscal.mdfe_reboque
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS mdfe_condutor_rls ON fiscal.mdfe_condutor;
CREATE POLICY mdfe_condutor_rls ON fiscal.mdfe_condutor
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS mdfe_percurso_rls ON fiscal.mdfe_percurso;
CREATE POLICY mdfe_percurso_rls ON fiscal.mdfe_percurso
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS mdfe_descarga_rls ON fiscal.mdfe_descarga;
CREATE POLICY mdfe_descarga_rls ON fiscal.mdfe_descarga
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS mdfe_documento_rls ON fiscal.mdfe_documento;
CREATE POLICY mdfe_documento_rls ON fiscal.mdfe_documento
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS mdfe_seguro_rls ON fiscal.mdfe_seguro;
CREATE POLICY mdfe_seguro_rls ON fiscal.mdfe_seguro
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS mdfe_seguro_averbacao_rls ON fiscal.mdfe_seguro_averbacao;
CREATE POLICY mdfe_seguro_averbacao_rls ON fiscal.mdfe_seguro_averbacao
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS mdfe_ciot_rls ON fiscal.mdfe_ciot;
CREATE POLICY mdfe_ciot_rls ON fiscal.mdfe_ciot
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS mdfe_evento_rls ON fiscal.mdfe_evento;
CREATE POLICY mdfe_evento_rls ON fiscal.mdfe_evento
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS mdfe_xml_rls ON fiscal.mdfe_xml;
CREATE POLICY mdfe_xml_rls ON fiscal.mdfe_xml
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);
