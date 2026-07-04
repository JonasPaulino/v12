CREATE UNIQUE INDEX IF NOT EXISTS idx_produto_erp_id_unique ON produto(erp_id) WHERE erp_id IS NOT NULL;
