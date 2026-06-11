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
