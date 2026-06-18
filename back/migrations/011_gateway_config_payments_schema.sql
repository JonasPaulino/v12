CREATE SCHEMA IF NOT EXISTS payments;

CREATE TABLE IF NOT EXISTS payments.tenant_configuracao_gateway (
  tenant_id INTEGER PRIMARY KEY REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL DEFAULT 'asaas'
    CHECK (provider IN ('asaas')),
  ambiente VARCHAR(20) NOT NULL DEFAULT 'sandbox'
    CHECK (ambiente IN ('sandbox', 'production')),
  wallet_id VARCHAR(120),
  api_key_criptografada TEXT,
  api_key_masked VARCHAR(80),
  webhook_auth_token_criptografada TEXT,
  webhook_auth_token_masked VARCHAR(80),
  gateway_ativo BOOLEAN NOT NULL DEFAULT FALSE,
  auto_criar_cliente BOOLEAN NOT NULL DEFAULT TRUE,
  baixa_automatica_pix BOOLEAN NOT NULL DEFAULT TRUE,
  baixa_automatica_boleto BOOLEAN NOT NULL DEFAULT TRUE,
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_configuracao_gateway_provider
  ON payments.tenant_configuracao_gateway (provider, ambiente, gateway_ativo);

DROP TRIGGER IF EXISTS trg_tenant_configuracao_gateway_updated_at ON payments.tenant_configuracao_gateway;
CREATE TRIGGER trg_tenant_configuracao_gateway_updated_at
BEFORE UPDATE ON payments.tenant_configuracao_gateway
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE payments.tenant_configuracao_gateway ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_configuracao_gateway_rls ON payments.tenant_configuracao_gateway;
CREATE POLICY tenant_configuracao_gateway_rls ON payments.tenant_configuracao_gateway
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'tenant_configuracao_gateway'
  ) THEN
    INSERT INTO payments.tenant_configuracao_gateway (
      tenant_id,
      provider,
      ambiente,
      wallet_id,
      api_key_criptografada,
      api_key_masked,
      webhook_auth_token_criptografada,
      webhook_auth_token_masked,
      gateway_ativo,
      auto_criar_cliente,
      baixa_automatica_pix,
      baixa_automatica_boleto,
      observacao,
      criado_em,
      atualizado_em
    )
    SELECT
      tenant_id,
      provider,
      ambiente,
      wallet_id,
      api_key_criptografada,
      api_key_masked,
      webhook_auth_token_criptografada,
      webhook_auth_token_masked,
      gateway_ativo,
      auto_criar_cliente,
      baixa_automatica_pix,
      baixa_automatica_boleto,
      observacao,
      criado_em,
      atualizado_em
    FROM public.tenant_configuracao_gateway
    ON CONFLICT (tenant_id) DO UPDATE
    SET
      provider = EXCLUDED.provider,
      ambiente = EXCLUDED.ambiente,
      wallet_id = EXCLUDED.wallet_id,
      api_key_criptografada = EXCLUDED.api_key_criptografada,
      api_key_masked = EXCLUDED.api_key_masked,
      webhook_auth_token_criptografada = EXCLUDED.webhook_auth_token_criptografada,
      webhook_auth_token_masked = EXCLUDED.webhook_auth_token_masked,
      gateway_ativo = EXCLUDED.gateway_ativo,
      auto_criar_cliente = EXCLUDED.auto_criar_cliente,
      baixa_automatica_pix = EXCLUDED.baixa_automatica_pix,
      baixa_automatica_boleto = EXCLUDED.baixa_automatica_boleto,
      observacao = EXCLUDED.observacao,
      criado_em = EXCLUDED.criado_em,
      atualizado_em = EXCLUDED.atualizado_em;
  END IF;
END $$;

INSERT INTO payments.tenant_configuracao_gateway (
  tenant_id,
  provider,
  ambiente,
  gateway_ativo,
  auto_criar_cliente,
  baixa_automatica_pix,
  baixa_automatica_boleto
)
SELECT
  t.tenant_id,
  'asaas',
  'sandbox',
  FALSE,
  TRUE,
  TRUE,
  TRUE
FROM tenant t
WHERE NOT EXISTS (
  SELECT 1
  FROM payments.tenant_configuracao_gateway cfg
  WHERE cfg.tenant_id = t.tenant_id
);
