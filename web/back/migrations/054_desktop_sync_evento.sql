CREATE TABLE IF NOT EXISTS desktop_sync_evento (
  desktop_sync_evento_id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenant(tenant_id),
  terminal_codigo VARCHAR(40),
  terminal_nome VARCHAR(120),
  local_sync_id BIGINT NOT NULL,
  event_type VARCHAR(60) NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'recebido',
  recebido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processado_em TIMESTAMPTZ,
  observacao TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_desktop_sync_evento_tenant_local
  ON desktop_sync_evento (tenant_id, local_sync_id);

CREATE INDEX IF NOT EXISTS idx_desktop_sync_evento_tenant_status
  ON desktop_sync_evento (tenant_id, status, recebido_em DESC);

CREATE INDEX IF NOT EXISTS idx_desktop_sync_evento_tipo
  ON desktop_sync_evento (event_type, recebido_em DESC);
