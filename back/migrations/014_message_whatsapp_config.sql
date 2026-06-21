CREATE SCHEMA IF NOT EXISTS message;

CREATE TABLE IF NOT EXISTS message.tenant_configuracao_whatsapp (
  tenant_id INTEGER PRIMARY KEY REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL DEFAULT 'evolution'
    CHECK (provider IN ('evolution')),
  whatsapp_ativo BOOLEAN NOT NULL DEFAULT FALSE,
  instance_name VARCHAR(120),
  remetente_numero VARCHAR(20),
  auto_enviar_boleto_venda BOOLEAN NOT NULL DEFAULT FALSE,
  auto_enviar_pix_venda BOOLEAN NOT NULL DEFAULT FALSE,
  mensagem_boleto_padrao TEXT,
  mensagem_pix_padrao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_whatsapp_provider
  ON message.tenant_configuracao_whatsapp (provider, whatsapp_ativo);

DROP TRIGGER IF EXISTS trg_message_tenant_configuracao_whatsapp_updated_at
  ON message.tenant_configuracao_whatsapp;
CREATE TRIGGER trg_message_tenant_configuracao_whatsapp_updated_at
BEFORE UPDATE ON message.tenant_configuracao_whatsapp
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE message.tenant_configuracao_whatsapp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_configuracao_whatsapp_rls
  ON message.tenant_configuracao_whatsapp;
CREATE POLICY tenant_configuracao_whatsapp_rls
  ON message.tenant_configuracao_whatsapp
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

INSERT INTO message.tenant_configuracao_whatsapp (
  tenant_id,
  provider,
  whatsapp_ativo,
  auto_enviar_boleto_venda,
  auto_enviar_pix_venda,
  mensagem_boleto_padrao,
  mensagem_pix_padrao
)
SELECT
  t.tenant_id,
  'evolution',
  FALSE,
  FALSE,
  FALSE,
  'Olá, {nome}. Seguem os boletos do título #{titulo_id}. {boletos}',
  'Olá, {nome}. Segue o PIX do título #{titulo_id}, parcela {parcela}. Valor: {valor}. Vencimento: {vencimento}. Copia e cola: {pix_copia_cola}'
FROM tenant t
WHERE NOT EXISTS (
  SELECT 1
  FROM message.tenant_configuracao_whatsapp cfg
  WHERE cfg.tenant_id = t.tenant_id
);
