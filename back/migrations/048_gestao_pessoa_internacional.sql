CREATE SCHEMA IF NOT EXISTS gestao;

ALTER TABLE gestao.pessoa
  ADD COLUMN IF NOT EXISTS pessoa_origem VARCHAR(20) NOT NULL DEFAULT 'brasil';

ALTER TABLE gestao.pessoa
  ADD COLUMN IF NOT EXISTS documento_estrangeiro VARCHAR(80);

ALTER TABLE gestao.pessoa
  ADD COLUMN IF NOT EXISTS pais_cadastro VARCHAR(60) NOT NULL DEFAULT 'Brasil';

ALTER TABLE gestao.pessoa
  ALTER COLUMN cpf_cnpj DROP NOT NULL;

ALTER TABLE gestao.pessoa_endereco
  ALTER COLUMN uf TYPE VARCHAR(60);

UPDATE gestao.pessoa
SET
  pessoa_origem = COALESCE(NULLIF(pessoa_origem, ''), 'brasil'),
  pais_cadastro = COALESCE(NULLIF(pais_cadastro, ''), 'Brasil')
WHERE pessoa_origem IS NULL
   OR pessoa_origem = ''
   OR pais_cadastro IS NULL
   OR pais_cadastro = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gestao_pessoa_origem_chk'
      AND conrelid = 'gestao.pessoa'::regclass
  ) THEN
    ALTER TABLE gestao.pessoa
      ADD CONSTRAINT gestao_pessoa_origem_chk
      CHECK (pessoa_origem IN ('brasil', 'exterior'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gestao_pessoa_documento_brasil_chk'
      AND conrelid = 'gestao.pessoa'::regclass
  ) THEN
    ALTER TABLE gestao.pessoa
      ADD CONSTRAINT gestao_pessoa_documento_brasil_chk
      CHECK (
        pessoa_origem <> 'brasil'
        OR (cpf_cnpj IS NOT NULL AND BTRIM(cpf_cnpj) <> '')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gestao_pessoa_origem
  ON gestao.pessoa (pessoa_origem, pais_cadastro)
  WHERE excluido = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gestao_pessoa_doc_estrangeiro_ativo
  ON gestao.pessoa (
    LOWER(COALESCE(pais_cadastro, '')),
    LOWER(COALESCE(documento_estrangeiro, ''))
  )
  WHERE excluido = FALSE
    AND pessoa_origem = 'exterior'
    AND documento_estrangeiro IS NOT NULL
    AND BTRIM(documento_estrangeiro) <> '';
