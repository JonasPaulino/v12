CREATE TABLE IF NOT EXISTS terminal_config (
  config_id INTEGER PRIMARY KEY CHECK (config_id = 1),
  tenant_erp_id INTEGER NOT NULL,
  tenant_nome TEXT NOT NULL,
  tenant_documento TEXT,
  tenant_ativo INTEGER NOT NULL DEFAULT 1,
  tenant_acesso_bloqueado INTEGER NOT NULL DEFAULT 0,
  tenant_bloqueio_motivo TEXT,
  terminal_codigo TEXT NOT NULL DEFAULT 'PDV-01',
  terminal_nome TEXT NOT NULL DEFAULT 'Caixa 01',
  ambiente TEXT NOT NULL DEFAULT 'producao',
  configurado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sincronizado_em TEXT
);

CREATE TABLE IF NOT EXISTS operador_local (
  operador_id INTEGER PRIMARY KEY AUTOINCREMENT,
  erp_usuario_id INTEGER,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  senha_hash TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  primeiro_acesso INTEGER NOT NULL DEFAULT 0,
  sincronizado_em TEXT,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operador_local_email
  ON operador_local(LOWER(TRIM(email)));

CREATE UNIQUE INDEX IF NOT EXISTS idx_operador_local_erp_usuario
  ON operador_local(erp_usuario_id)
  WHERE erp_usuario_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS operador_perfil (
  operador_perfil_id INTEGER PRIMARY KEY AUTOINCREMENT,
  operador_id INTEGER NOT NULL REFERENCES operador_local(operador_id) ON DELETE CASCADE,
  perfil TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (operador_id, perfil)
);

CREATE INDEX IF NOT EXISTS idx_operador_perfil_operador
  ON operador_perfil(operador_id, ativo);

ALTER TABLE caixa ADD COLUMN tenant_erp_id INTEGER;
ALTER TABLE caixa ADD COLUMN terminal_codigo TEXT;
ALTER TABLE caixa ADD COLUMN operador_id INTEGER REFERENCES operador_local(operador_id);
ALTER TABLE caixa ADD COLUMN sessao_codigo TEXT;
ALTER TABLE caixa ADD COLUMN observacao_abertura TEXT;
ALTER TABLE caixa ADD COLUMN observacao_fechamento TEXT;
ALTER TABLE caixa ADD COLUMN diferenca_fechamento NUMERIC NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_caixa_sessao_codigo
  ON caixa(sessao_codigo)
  WHERE sessao_codigo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_caixa_tenant_terminal_status
  ON caixa(tenant_erp_id, terminal_codigo, status);

CREATE TABLE IF NOT EXISTS caixa_movimento (
  movimento_id INTEGER PRIMARY KEY AUTOINCREMENT,
  caixa_id INTEGER NOT NULL REFERENCES caixa(caixa_id) ON DELETE CASCADE,
  operador_id INTEGER REFERENCES operador_local(operador_id),
  tipo TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  motivo TEXT,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_caixa_movimento_caixa_tipo
  ON caixa_movimento(caixa_id, tipo, criado_em);
