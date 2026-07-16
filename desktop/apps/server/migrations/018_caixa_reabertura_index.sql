CREATE INDEX IF NOT EXISTS idx_caixa_tenant_terminal_operador_status
  ON caixa(tenant_erp_id, terminal_codigo, operador_id, status, caixa_id DESC);
