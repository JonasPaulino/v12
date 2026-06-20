ALTER TABLE produto_unidade
  ALTER COLUMN fator_conversao SET DEFAULT 1;

ALTER TABLE produto_unidade
  ALTER COLUMN casas_decimais_comercial SET DEFAULT 2;

ALTER TABLE produto_unidade
  ALTER COLUMN casas_decimais_tributavel SET DEFAULT 2;

UPDATE produto_unidade
SET
  fator_conversao = 1,
  casas_decimais_comercial = 2,
  casas_decimais_tributavel = 2
WHERE
  fator_conversao <> 1
  OR casas_decimais_comercial <> 2
  OR casas_decimais_tributavel <> 2;
