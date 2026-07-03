-- Índices complementares do schema payments para consultas por cliente,
-- cobrança, status e eventos pendentes.

CREATE INDEX IF NOT EXISTS idx_payments_gateway_customer_reference
  ON payments.gateway_customer (tenant_id, provider, external_reference)
  WHERE external_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_gateway_charge_parcela
  ON payments.gateway_charge (tenant_id, provider, financeiro_titulo_parcela_id, status)
  WHERE financeiro_titulo_parcela_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_gateway_charge_pessoa
  ON payments.gateway_charge (tenant_id, provider, pessoa_id, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_gateway_charge_status_due
  ON payments.gateway_charge (tenant_id, provider, status, due_date);

CREATE INDEX IF NOT EXISTS idx_payments_gateway_event_pending
  ON payments.gateway_event (provider, processed, criado_em)
  WHERE processed = FALSE;
