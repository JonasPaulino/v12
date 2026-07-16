CREATE TABLE IF NOT EXISTS backup_execucao (
  backup_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_erp_id INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  status TEXT NOT NULL,
  arquivo_nome TEXT,
  arquivo_local TEXT,
  arquivo_sha256 TEXT,
  tamanho_bytes INTEGER NOT NULL DEFAULT 0,
  retaguarda_backup_id TEXT,
  retaguarda_status TEXT,
  retaguarda_link TEXT,
  manifest_json TEXT,
  iniciado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  concluido_em TEXT,
  erro TEXT
);

CREATE TABLE IF NOT EXISTS backup_item (
  backup_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_erp_id INTEGER NOT NULL,
  backup_id INTEGER REFERENCES backup_execucao(backup_id),
  origem_tipo TEXT NOT NULL,
  origem_chave TEXT NOT NULL,
  source_path TEXT,
  source_mtime_ms INTEGER,
  source_size INTEGER NOT NULL DEFAULT 0,
  sha256 TEXT NOT NULL,
  enviado_em TEXT,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backup_execucao_tenant_status
  ON backup_execucao(tenant_erp_id, status, iniciado_em DESC);

CREATE INDEX IF NOT EXISTS idx_backup_item_tenant_origem_hash
  ON backup_item(tenant_erp_id, origem_tipo, origem_chave, sha256);

CREATE INDEX IF NOT EXISTS idx_backup_item_tenant_enviado
  ON backup_item(tenant_erp_id, enviado_em DESC);
