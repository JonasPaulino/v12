CREATE TABLE IF NOT EXISTS tenant_configuracao_fiscal (
  tenant_id INTEGER PRIMARY KEY REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  ambiente_nfe VARCHAR(1) NOT NULL DEFAULT '2'
    CHECK (ambiente_nfe IN ('1', '2')),
  serie_nfe_padrao INTEGER NOT NULL DEFAULT 1,
  proximo_numero_nfe INTEGER NOT NULL DEFAULT 1,
  crt VARCHAR(1) NOT NULL DEFAULT '3'
    CHECK (crt IN ('1', '2', '3')),
  cnae VARCHAR(7),
  natureza_operacao_padrao VARCHAR(120),
  nfe_habilitada BOOLEAN NOT NULL DEFAULT FALSE,
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_certificado_a1 (
  tenant_id INTEGER PRIMARY KEY REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  nome_arquivo VARCHAR(180),
  conteudo_pfx BYTEA,
  senha_criptografada TEXT,
  tamanho_arquivo INTEGER,
  validade_em TIMESTAMPTZ,
  importado_em TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_configuracao_fiscal_habilitada
  ON tenant_configuracao_fiscal (nfe_habilitada, ambiente_nfe);

DROP TRIGGER IF EXISTS trg_tenant_configuracao_fiscal_updated_at ON tenant_configuracao_fiscal;
CREATE TRIGGER trg_tenant_configuracao_fiscal_updated_at
BEFORE UPDATE ON tenant_configuracao_fiscal
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tenant_certificado_a1_updated_at ON tenant_certificado_a1;
CREATE TRIGGER trg_tenant_certificado_a1_updated_at
BEFORE UPDATE ON tenant_certificado_a1
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE tenant_configuracao_fiscal ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_certificado_a1 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_configuracao_fiscal_rls ON tenant_configuracao_fiscal;
CREATE POLICY tenant_configuracao_fiscal_rls ON tenant_configuracao_fiscal
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS tenant_certificado_a1_rls ON tenant_certificado_a1;
CREATE POLICY tenant_certificado_a1_rls ON tenant_certificado_a1
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

INSERT INTO tenant_configuracao_fiscal (
  tenant_id,
  ambiente_nfe,
  serie_nfe_padrao,
  proximo_numero_nfe,
  crt,
  natureza_operacao_padrao,
  nfe_habilitada
)
SELECT
  t.tenant_id,
  '2',
  1,
  1,
  '3',
  'Venda de mercadoria',
  FALSE
FROM tenant t
WHERE NOT EXISTS (
  SELECT 1
  FROM tenant_configuracao_fiscal cfg
  WHERE cfg.tenant_id = t.tenant_id
);
