CREATE TABLE IF NOT EXISTS tenant_logo (
  tenant_id INTEGER PRIMARY KEY REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  nome_arquivo VARCHAR(180),
  mime_type VARCHAR(80),
  conteudo BYTEA,
  tamanho_arquivo INTEGER,
  importado_em TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_tenant_logo_updated_at ON tenant_logo;
CREATE TRIGGER trg_tenant_logo_updated_at
BEFORE UPDATE ON tenant_logo
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE tenant_logo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_logo_rls ON tenant_logo;
CREATE POLICY tenant_logo_rls ON tenant_logo
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);
