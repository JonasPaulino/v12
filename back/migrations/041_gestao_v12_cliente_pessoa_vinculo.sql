ALTER TABLE gestao.cliente_contrato
  ADD COLUMN IF NOT EXISTS pessoa_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cliente_contrato_pessoa_fk'
  ) THEN
    ALTER TABLE gestao.cliente_contrato
      ADD CONSTRAINT cliente_contrato_pessoa_fk
      FOREIGN KEY (pessoa_id)
      REFERENCES gestao.pessoa(pessoa_id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cliente_contrato_pessoa
  ON gestao.cliente_contrato (pessoa_id);

WITH origem AS (
  SELECT DISTINCT ON (REGEXP_REPLACE(COALESCE(p.pessoa_cpf_cnpj, t.tenant_documento, ''), '\D', '', 'g'))
    'J' AS pessoa_tipo,
    p.pessoa_nome_razao AS nome_razao,
    p.pessoa_nome_fantasia AS nome_fantasia,
    REGEXP_REPLACE(COALESCE(p.pessoa_cpf_cnpj, t.tenant_documento, ''), '\D', '', 'g') AS cpf_cnpj,
    p.pessoa_inscricao_estadual AS inscricao_estadual,
    p.pessoa_inscricao_municipal AS inscricao_municipal,
    p.pessoa_email AS email,
    p.pessoa_telefone AS telefone,
    t.tenant_ativo AS ativo
  FROM tenant t
  JOIN pessoa p ON p.pessoa_id = t.pessoa_id
  WHERE REGEXP_REPLACE(COALESCE(p.pessoa_cpf_cnpj, t.tenant_documento, ''), '\D', '', 'g') <> ''
  ORDER BY
    REGEXP_REPLACE(COALESCE(p.pessoa_cpf_cnpj, t.tenant_documento, ''), '\D', '', 'g'),
    t.tenant_id
)
INSERT INTO gestao.pessoa (
  pessoa_tipo,
  nome_razao,
  nome_fantasia,
  cpf_cnpj,
  inscricao_estadual,
  inscricao_municipal,
  email,
  telefone,
  ativo,
  excluido
)
SELECT
  pessoa_tipo,
  nome_razao,
  nome_fantasia,
  cpf_cnpj,
  inscricao_estadual,
  inscricao_municipal,
  email,
  telefone,
  ativo,
  FALSE
FROM origem o
WHERE NOT EXISTS (
  SELECT 1
  FROM gestao.pessoa gp
  WHERE gp.cpf_cnpj = o.cpf_cnpj
    AND gp.excluido = FALSE
);

INSERT INTO gestao.pessoa_endereco (
  pessoa_id,
  endereco_tipo,
  cep,
  logradouro,
  numero,
  complemento,
  bairro,
  cidade,
  uf,
  codigo_ibge,
  pais
)
SELECT
  gp.pessoa_id,
  'principal',
  pe.cep,
  pe.logradouro,
  pe.numero,
  pe.complemento,
  pe.bairro,
  pe.cidade,
  pe.uf,
  pe.codigo_ibge,
  COALESCE(pe.pais, 'Brasil')
FROM tenant t
JOIN pessoa p ON p.pessoa_id = t.pessoa_id
JOIN gestao.pessoa gp
  ON gp.cpf_cnpj = REGEXP_REPLACE(COALESCE(p.pessoa_cpf_cnpj, t.tenant_documento, ''), '\D', '', 'g')
 AND gp.excluido = FALSE
LEFT JOIN LATERAL (
  SELECT *
  FROM pessoa_endereco
  WHERE pessoa_id = p.pessoa_id
    AND endereco_tipo = 'principal'
  ORDER BY atualizado_em DESC, criado_em DESC
  LIMIT 1
) pe ON TRUE
WHERE pe.pessoa_endereco_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM gestao.pessoa_endereco gpe
    WHERE gpe.pessoa_id = gp.pessoa_id
      AND gpe.endereco_tipo = 'principal'
  );

UPDATE gestao.cliente_contrato cc
SET pessoa_id = gp.pessoa_id
FROM tenant t
JOIN pessoa p ON p.pessoa_id = t.pessoa_id
JOIN gestao.pessoa gp
  ON gp.cpf_cnpj = REGEXP_REPLACE(COALESCE(p.pessoa_cpf_cnpj, t.tenant_documento, ''), '\D', '', 'g')
 AND gp.excluido = FALSE
WHERE cc.tenant_id = t.tenant_id
  AND cc.pessoa_id IS NULL;

UPDATE gestao.financeiro_titulo ft
SET pessoa_id = cc.pessoa_id
FROM gestao.cliente_contrato cc
WHERE ft.contrato_id = cc.contrato_id
  AND ft.pessoa_id IS NULL
  AND cc.pessoa_id IS NOT NULL;
