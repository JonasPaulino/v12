CREATE TABLE IF NOT EXISTS pdv.backup_fiscal (
  pdv_backup_fiscal_id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  pdv_terminal_id BIGINT REFERENCES pdv.terminal(pdv_terminal_id) ON DELETE SET NULL,
  terminal_codigo VARCHAR(40),
  terminal_nome VARCHAR(120),
  status VARCHAR(30) NOT NULL DEFAULT 'recebido',
  arquivo_nome VARCHAR(180) NOT NULL,
  arquivo_sha256 VARCHAR(64) NOT NULL,
  tamanho_bytes BIGINT NOT NULL DEFAULT 0,
  drive_file_id VARCHAR(160),
  drive_web_view_link TEXT,
  drive_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  manifest_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  erro TEXT,
  recebido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enviado_drive_em TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, arquivo_sha256)
);

CREATE TABLE IF NOT EXISTS pdv.backup_fiscal_item (
  pdv_backup_fiscal_item_id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  pdv_backup_fiscal_id BIGINT NOT NULL REFERENCES pdv.backup_fiscal(pdv_backup_fiscal_id) ON DELETE CASCADE,
  origem_tipo VARCHAR(40) NOT NULL,
  origem_chave TEXT NOT NULL,
  caminho_relativo TEXT,
  tamanho_bytes BIGINT NOT NULL DEFAULT 0,
  sha256 VARCHAR(64) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, origem_tipo, origem_chave, sha256)
);

CREATE INDEX IF NOT EXISTS idx_pdv_backup_fiscal_tenant_status
  ON pdv.backup_fiscal (tenant_id, status, recebido_em DESC);

CREATE INDEX IF NOT EXISTS idx_pdv_backup_fiscal_terminal
  ON pdv.backup_fiscal (pdv_terminal_id, recebido_em DESC);

CREATE INDEX IF NOT EXISTS idx_pdv_backup_fiscal_item_backup
  ON pdv.backup_fiscal_item (pdv_backup_fiscal_id);
