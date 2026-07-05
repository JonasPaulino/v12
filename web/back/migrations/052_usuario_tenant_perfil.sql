CREATE TABLE IF NOT EXISTS usuario_tenant_perfil (
  usuario_tenant_perfil_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuario(usuario_id) ON DELETE CASCADE,
  perfil VARCHAR(60) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, usuario_id, perfil)
);

CREATE INDEX IF NOT EXISTS idx_usuario_tenant_perfil_usuario_tenant
  ON usuario_tenant_perfil (usuario_id, tenant_id, ativo);

CREATE INDEX IF NOT EXISTS idx_usuario_tenant_perfil_tenant_perfil
  ON usuario_tenant_perfil (tenant_id, perfil, ativo);

INSERT INTO usuario_tenant_perfil (tenant_id, usuario_id, perfil, ativo)
SELECT tenant_id, usuario_id, COALESCE(NULLIF(perfil, ''), 'usuario'), ativo
FROM usuario_tenant
ON CONFLICT (tenant_id, usuario_id, perfil)
DO UPDATE SET
  ativo = EXCLUDED.ativo,
  atualizado_em = NOW();
