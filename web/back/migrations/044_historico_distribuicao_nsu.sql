CREATE TABLE IF NOT EXISTS nfe_distribuicao_historico (
  nfe_distribuicao_historico_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  nfe_distribuicao_controle_id INTEGER REFERENCES nfe_distribuicao_controle(nfe_distribuicao_controle_id) ON DELETE SET NULL,
  usuario_id INTEGER REFERENCES usuario(usuario_id),
  ambiente VARCHAR(1) NOT NULL,
  documento VARCHAR(14) NOT NULL,
  uf VARCHAR(2) NOT NULL,
  ult_nsu_enviado VARCHAR(15) NOT NULL,
  ult_nsu_retorno VARCHAR(15),
  max_nsu_retorno VARCHAR(15),
  cstat VARCHAR(3),
  xmotivo TEXT,
  sucesso BOOLEAN NOT NULL DEFAULT FALSE,
  documentos_recebidos INTEGER NOT NULL DEFAULT 0,
  documentos_salvos INTEGER NOT NULL DEFAULT 0,
  documentos_novos INTEGER NOT NULL DEFAULT 0,
  ignorados_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  resposta_raw TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nfe_distribuicao_historico_tenant
  ON nfe_distribuicao_historico (tenant_id, ambiente, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_nfe_distribuicao_historico_controle
  ON nfe_distribuicao_historico (nfe_distribuicao_controle_id, criado_em DESC);

ALTER TABLE nfe_distribuicao_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nfe_distribuicao_historico_rls ON nfe_distribuicao_historico;
CREATE POLICY nfe_distribuicao_historico_rls ON nfe_distribuicao_historico
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);
