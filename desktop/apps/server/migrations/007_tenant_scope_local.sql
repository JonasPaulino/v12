ALTER TABLE pessoa ADD COLUMN tenant_erp_id INTEGER;
ALTER TABLE produto ADD COLUMN tenant_erp_id INTEGER;
ALTER TABLE venda ADD COLUMN tenant_erp_id INTEGER;
ALTER TABLE venda_item ADD COLUMN tenant_erp_id INTEGER;
ALTER TABLE venda_pagamento ADD COLUMN tenant_erp_id INTEGER;
ALTER TABLE nfce ADD COLUMN tenant_erp_id INTEGER;
ALTER TABLE sync_queue ADD COLUMN tenant_erp_id INTEGER;
ALTER TABLE operador_local ADD COLUMN tenant_erp_id INTEGER;
ALTER TABLE operador_perfil ADD COLUMN tenant_erp_id INTEGER;
ALTER TABLE caixa_movimento ADD COLUMN tenant_erp_id INTEGER;

UPDATE pessoa
SET tenant_erp_id = (
  SELECT tenant_erp_id
  FROM terminal_config
  WHERE config_id = 1
)
WHERE tenant_erp_id IS NULL;

UPDATE produto
SET tenant_erp_id = (
  SELECT tenant_erp_id
  FROM terminal_config
  WHERE config_id = 1
)
WHERE tenant_erp_id IS NULL;

UPDATE operador_local
SET tenant_erp_id = (
  SELECT tenant_erp_id
  FROM terminal_config
  WHERE config_id = 1
)
WHERE tenant_erp_id IS NULL;

UPDATE operador_perfil
SET tenant_erp_id = (
  SELECT ol.tenant_erp_id
  FROM operador_local ol
  WHERE ol.operador_id = operador_perfil.operador_id
)
WHERE tenant_erp_id IS NULL;

UPDATE venda
SET tenant_erp_id = (
  SELECT c.tenant_erp_id
  FROM caixa c
  WHERE c.caixa_id = venda.caixa_id
)
WHERE tenant_erp_id IS NULL;

UPDATE venda_item
SET tenant_erp_id = (
  SELECT v.tenant_erp_id
  FROM venda v
  WHERE v.venda_id = venda_item.venda_id
)
WHERE tenant_erp_id IS NULL;

UPDATE venda_pagamento
SET tenant_erp_id = (
  SELECT v.tenant_erp_id
  FROM venda v
  WHERE v.venda_id = venda_pagamento.venda_id
)
WHERE tenant_erp_id IS NULL;

UPDATE nfce
SET tenant_erp_id = (
  SELECT v.tenant_erp_id
  FROM venda v
  WHERE v.venda_id = nfce.venda_id
)
WHERE tenant_erp_id IS NULL;

UPDATE caixa_movimento
SET tenant_erp_id = (
  SELECT c.tenant_erp_id
  FROM caixa c
  WHERE c.caixa_id = caixa_movimento.caixa_id
)
WHERE tenant_erp_id IS NULL;

UPDATE sync_queue
SET tenant_erp_id = (
  SELECT tenant_erp_id
  FROM terminal_config
  WHERE config_id = 1
)
WHERE tenant_erp_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_pessoa_tenant_documento
  ON pessoa(tenant_erp_id, documento);

CREATE INDEX IF NOT EXISTS idx_produto_tenant_codigo
  ON produto(tenant_erp_id, codigo);

CREATE INDEX IF NOT EXISTS idx_produto_tenant_erp_id
  ON produto(tenant_erp_id, erp_id);

CREATE INDEX IF NOT EXISTS idx_operador_local_tenant_email
  ON operador_local(tenant_erp_id, LOWER(TRIM(email)));

CREATE INDEX IF NOT EXISTS idx_operador_local_tenant_erp_usuario
  ON operador_local(tenant_erp_id, erp_usuario_id);

CREATE INDEX IF NOT EXISTS idx_operador_perfil_tenant_operador
  ON operador_perfil(tenant_erp_id, operador_id, ativo);

CREATE INDEX IF NOT EXISTS idx_venda_tenant_status
  ON venda(tenant_erp_id, status, venda_id DESC);

CREATE INDEX IF NOT EXISTS idx_venda_item_tenant_venda
  ON venda_item(tenant_erp_id, venda_id);

CREATE INDEX IF NOT EXISTS idx_venda_pagamento_tenant_venda
  ON venda_pagamento(tenant_erp_id, venda_id);

CREATE INDEX IF NOT EXISTS idx_nfce_tenant_venda
  ON nfce(tenant_erp_id, venda_id, status);

CREATE INDEX IF NOT EXISTS idx_caixa_movimento_tenant_caixa
  ON caixa_movimento(tenant_erp_id, caixa_id, tipo, criado_em);

CREATE INDEX IF NOT EXISTS idx_sync_queue_tenant_status
  ON sync_queue(tenant_erp_id, status, criado_em);
