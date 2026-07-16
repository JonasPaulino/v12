CREATE TABLE IF NOT EXISTS gestao.pdv_release (
  pdv_release_id BIGSERIAL PRIMARY KEY,
  versao VARCHAR(40) NOT NULL,
  canal VARCHAR(30) NOT NULL DEFAULT 'stable',
  plataforma VARCHAR(40) NOT NULL DEFAULT 'win32-x64',
  tipo_release VARCHAR(30) NOT NULL DEFAULT 'app',
  modo_aplicacao VARCHAR(30) NOT NULL DEFAULT 'manual',
  status VARCHAR(30) NOT NULL DEFAULT 'rascunho',
  obrigatorio BOOLEAN NOT NULL DEFAULT FALSE,
  rollback_habilitado BOOLEAN NOT NULL DEFAULT TRUE,
  arquivo_nome VARCHAR(220) NOT NULL,
  arquivo_original VARCHAR(220),
  arquivo_path TEXT NOT NULL,
  arquivo_sha256 VARCHAR(64) NOT NULL,
  tamanho_bytes BIGINT NOT NULL DEFAULT 0,
  manifest_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  notas TEXT,
  publicado_em TIMESTAMPTZ,
  criado_por INTEGER REFERENCES usuario(usuario_id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (canal, plataforma, versao)
);

ALTER TABLE gestao.pdv_release
  ADD COLUMN IF NOT EXISTS tipo_release VARCHAR(30) NOT NULL DEFAULT 'app';

ALTER TABLE gestao.pdv_release
  ADD COLUMN IF NOT EXISTS modo_aplicacao VARCHAR(30) NOT NULL DEFAULT 'manual';

ALTER TABLE gestao.pdv_release
  ADD COLUMN IF NOT EXISTS rollback_habilitado BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE gestao.pdv_release
  ADD COLUMN IF NOT EXISTS manifest_json JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_gestao_pdv_release_publicado
  ON gestao.pdv_release (canal, plataforma, tipo_release, status, publicado_em DESC);

CREATE INDEX IF NOT EXISTS idx_gestao_pdv_release_versao
  ON gestao.pdv_release (versao, canal, plataforma);
