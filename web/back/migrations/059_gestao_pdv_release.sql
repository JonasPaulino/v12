CREATE TABLE IF NOT EXISTS gestao.pdv_release (
  pdv_release_id BIGSERIAL PRIMARY KEY,
  versao VARCHAR(40) NOT NULL,
  canal VARCHAR(30) NOT NULL DEFAULT 'stable',
  plataforma VARCHAR(40) NOT NULL DEFAULT 'win32-x64',
  status VARCHAR(30) NOT NULL DEFAULT 'rascunho',
  obrigatorio BOOLEAN NOT NULL DEFAULT FALSE,
  arquivo_nome VARCHAR(220) NOT NULL,
  arquivo_original VARCHAR(220),
  arquivo_path TEXT NOT NULL,
  arquivo_sha256 VARCHAR(64) NOT NULL,
  tamanho_bytes BIGINT NOT NULL DEFAULT 0,
  notas TEXT,
  publicado_em TIMESTAMPTZ,
  criado_por INTEGER REFERENCES usuario(usuario_id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (canal, plataforma, versao)
);

CREATE INDEX IF NOT EXISTS idx_gestao_pdv_release_publicado
  ON gestao.pdv_release (canal, plataforma, status, publicado_em DESC);

CREATE INDEX IF NOT EXISTS idx_gestao_pdv_release_versao
  ON gestao.pdv_release (versao, canal, plataforma);
