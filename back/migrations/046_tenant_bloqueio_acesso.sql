ALTER TABLE tenant
  ADD COLUMN IF NOT EXISTS tenant_acesso_bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tenant_bloqueio_motivo TEXT,
  ADD COLUMN IF NOT EXISTS tenant_bloqueado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tenant_bloqueado_por INTEGER REFERENCES usuario(usuario_id);

CREATE INDEX IF NOT EXISTS idx_tenant_acesso_bloqueado
  ON tenant (tenant_acesso_bloqueado);
