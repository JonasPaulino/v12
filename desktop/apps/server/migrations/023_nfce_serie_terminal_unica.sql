CREATE UNIQUE INDEX IF NOT EXISTS idx_nfce_tenant_ambiente_serie_numero
  ON nfce(tenant_erp_id, ambiente, serie, numero)
  WHERE tenant_erp_id IS NOT NULL
    AND ambiente IS NOT NULL
    AND serie IS NOT NULL
    AND numero IS NOT NULL;
