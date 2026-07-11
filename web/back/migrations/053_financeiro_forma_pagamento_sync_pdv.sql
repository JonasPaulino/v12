ALTER TABLE financeiro_forma_pagamento
  ADD COLUMN IF NOT EXISTS sincronizar_pdv BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE financeiro_forma_pagamento
SET sincronizar_pdv = TRUE
WHERE LOWER(unaccent(descricao)) IN (
  'dinheiro',
  'pix',
  'cartao de debito',
  'cartao de credito',
  'transferencia'
);

CREATE INDEX IF NOT EXISTS idx_fin_forma_pagamento_tenant_pdv
  ON financeiro_forma_pagamento (tenant_id, ativo, tipo, sincronizar_pdv);
