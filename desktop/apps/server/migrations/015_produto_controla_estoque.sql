ALTER TABLE produto ADD COLUMN controla_estoque INTEGER NOT NULL DEFAULT 1;

UPDATE produto
SET controla_estoque = 1
WHERE controla_estoque IS NULL;

CREATE INDEX IF NOT EXISTS idx_produto_tenant_controla_estoque
  ON produto(tenant_erp_id, controla_estoque, ativo);
