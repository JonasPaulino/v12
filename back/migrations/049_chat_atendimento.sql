CREATE SCHEMA IF NOT EXISTS chat;

CREATE TABLE IF NOT EXISTS chat.configuracao (
  configuracao_id INTEGER PRIMARY KEY DEFAULT 1,
  chat_ativo BOOLEAN NOT NULL DEFAULT TRUE,
  horario_inicio TIME,
  horario_fim TIME,
  mensagem_fora_horario TEXT,
  atualizado_por INTEGER,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_configuracao_singleton_chk CHECK (configuracao_id = 1)
);

CREATE TABLE IF NOT EXISTS chat.categoria (
  categoria_id SERIAL PRIMARY KEY,
  slug VARCHAR(40) NOT NULL UNIQUE,
  nome VARCHAR(80) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat.atendimento (
  atendimento_id SERIAL PRIMARY KEY,
  protocolo VARCHAR(30) NOT NULL UNIQUE,
  client_token VARCHAR(80) NOT NULL UNIQUE,
  categoria_id INTEGER NOT NULL REFERENCES chat.categoria(categoria_id),
  tenant_id INTEGER REFERENCES tenant(tenant_id),
  usuario_id INTEGER REFERENCES usuario(usuario_id),
  atendente_usuario_id INTEGER REFERENCES usuario(usuario_id),
  cliente_nome VARCHAR(160) NOT NULL,
  cliente_email VARCHAR(160),
  cliente_telefone VARCHAR(40),
  assunto VARCHAR(180) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'aguardando'
    CHECK (status IN ('aguardando', 'em_atendimento', 'encerrado')),
  primeira_resposta_em TIMESTAMP,
  encerrado_em TIMESTAMP,
  avaliacao_nota INTEGER CHECK (avaliacao_nota BETWEEN 1 AND 5),
  avaliacao_comentario TEXT,
  avaliado_em TIMESTAMP,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat.mensagem (
  mensagem_id SERIAL PRIMARY KEY,
  atendimento_id INTEGER NOT NULL REFERENCES chat.atendimento(atendimento_id) ON DELETE CASCADE,
  autor_tipo VARCHAR(20) NOT NULL CHECK (autor_tipo IN ('cliente', 'atendente', 'sistema')),
  autor_nome VARCHAR(160) NOT NULL,
  usuario_id INTEGER REFERENCES usuario(usuario_id),
  conteudo TEXT NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat.transferencia (
  transferencia_id SERIAL PRIMARY KEY,
  atendimento_id INTEGER NOT NULL REFERENCES chat.atendimento(atendimento_id) ON DELETE CASCADE,
  categoria_origem_id INTEGER REFERENCES chat.categoria(categoria_id),
  categoria_destino_id INTEGER NOT NULL REFERENCES chat.categoria(categoria_id),
  usuario_id INTEGER REFERENCES usuario(usuario_id),
  motivo TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO chat.configuracao (
  configuracao_id,
  chat_ativo,
  horario_inicio,
  horario_fim,
  mensagem_fora_horario
)
VALUES (
  1,
  TRUE,
  '08:00',
  '18:00',
  'Nosso atendimento está fora do horário no momento. Envie sua mensagem e retornaremos assim que possível.'
)
ON CONFLICT (configuracao_id) DO NOTHING;

INSERT INTO chat.categoria (slug, nome, descricao, ordem)
VALUES
  ('vendas', 'Vendas', 'Atendimento comercial para novos clientes e contratação.', 10),
  ('financeiro', 'Financeiro', 'Atendimento sobre boletos, cobranças e pagamentos.', 20),
  ('suporte', 'Suporte', 'Atendimento técnico e dúvidas de uso do V12 ERP.', 30)
ON CONFLICT (slug) DO UPDATE
SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ordem = EXCLUDED.ordem;

CREATE INDEX IF NOT EXISTS idx_chat_atendimento_status_categoria
  ON chat.atendimento (status, categoria_id, criado_em);

CREATE INDEX IF NOT EXISTS idx_chat_atendimento_token
  ON chat.atendimento (client_token);

CREATE INDEX IF NOT EXISTS idx_chat_atendimento_tenant_usuario
  ON chat.atendimento (tenant_id, usuario_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_chat_mensagem_atendimento_data
  ON chat.mensagem (atendimento_id, criado_em, mensagem_id);
