ALTER TABLE chat.configuracao
  ADD COLUMN IF NOT EXISTS notificacao_whatsapp_ativa BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notificacao_whatsapp_numero VARCHAR(20),
  ADD COLUMN IF NOT EXISTS notificacao_whatsapp_minutos INTEGER NOT NULL DEFAULT 10;

ALTER TABLE chat.atendimento
  ADD COLUMN IF NOT EXISTS notificacao_whatsapp_enviada_em TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_chat_atendimento_notificacao_whatsapp
  ON chat.atendimento (status, atendente_usuario_id, notificacao_whatsapp_enviada_em, criado_em)
  WHERE status = 'aguardando';

UPDATE chat.configuracao
SET notificacao_whatsapp_minutos = 10
WHERE configuracao_id = 1
  AND (notificacao_whatsapp_minutos IS NULL OR notificacao_whatsapp_minutos < 1);
