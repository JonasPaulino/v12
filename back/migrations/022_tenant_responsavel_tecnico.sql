CREATE TABLE IF NOT EXISTS tenant_responsavel_tecnico (
  tenant_id INTEGER PRIMARY KEY REFERENCES tenant(tenant_id) ON DELETE CASCADE,
  cnpj VARCHAR(14) NOT NULL,
  nome VARCHAR(150) NOT NULL,
  contato VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  logradouro VARCHAR(180),
  numero VARCHAR(20),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_tenant_responsavel_tecnico_updated_at ON tenant_responsavel_tecnico;
CREATE TRIGGER trg_tenant_responsavel_tecnico_updated_at
BEFORE UPDATE ON tenant_responsavel_tecnico
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE tenant_responsavel_tecnico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_responsavel_tecnico_rls ON tenant_responsavel_tecnico;
CREATE POLICY tenant_responsavel_tecnico_rls ON tenant_responsavel_tecnico
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

INSERT INTO tenant_responsavel_tecnico (
  tenant_id,
  cnpj,
  nome,
  contato,
  email,
  telefone,
  logradouro,
  numero,
  bairro,
  cidade,
  uf
)
SELECT
  t.tenant_id,
  '66056990000198',
  'jhes sistemas',
  'Jonas Paulino',
  'jonaspaulino@jhes.com.br',
  '819984163086',
  'Rua nova Baraunas',
  '451',
  'nova caruaru',
  'Caruaru',
  'PE'
FROM tenant t
ON CONFLICT (tenant_id) DO NOTHING;
