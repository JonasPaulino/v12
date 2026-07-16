CREATE TABLE IF NOT EXISTS release_update (
  release_update_id INTEGER PRIMARY KEY AUTOINCREMENT,
  release_id TEXT NOT NULL,
  versao TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'stable',
  plataforma TEXT NOT NULL DEFAULT 'win32-x64',
  status TEXT NOT NULL DEFAULT 'disponivel',
  obrigatorio INTEGER NOT NULL DEFAULT 0,
  arquivo_nome TEXT,
  arquivo_original TEXT,
  arquivo_local TEXT,
  arquivo_sha256 TEXT,
  tamanho_bytes INTEGER NOT NULL DEFAULT 0,
  notas TEXT,
  publicado_em TEXT,
  baixado_em TEXT,
  instalado_em TEXT,
  ultimo_erro TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_release_update_release_id
  ON release_update(release_id);

CREATE INDEX IF NOT EXISTS idx_release_update_status
  ON release_update(status, criado_em DESC);
