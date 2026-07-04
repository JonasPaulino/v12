CREATE SCHEMA IF NOT EXISTS fiscal;

CREATE TABLE IF NOT EXISTS fiscal.nfe (
  nfe_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenant(tenant_id) ON DELETE CASCADE,
  pedido_venda_id INTEGER REFERENCES public.pedido_venda(pedido_venda_id) ON DELETE SET NULL,
  emitente_pessoa_id INTEGER NOT NULL REFERENCES public.pessoa(pessoa_id),
  destinatario_pessoa_id INTEGER REFERENCES public.pessoa(pessoa_id),
  usuario_id INTEGER REFERENCES public.usuario(usuario_id),
  modelo VARCHAR(2) NOT NULL DEFAULT '55' CHECK (modelo = '55'),
  serie INTEGER NOT NULL DEFAULT 1,
  numero INTEGER,
  chave_acesso VARCHAR(44),
  natureza_operacao VARCHAR(120) NOT NULL,
  tipo_operacao VARCHAR(10) NOT NULL DEFAULT 'saida'
    CHECK (tipo_operacao IN ('entrada', 'saida')),
  finalidade VARCHAR(20) NOT NULL DEFAULT 'normal'
    CHECK (finalidade IN ('normal', 'complementar', 'ajuste', 'devolucao')),
  status VARCHAR(30) NOT NULL DEFAULT 'rascunho'
    CHECK (
      status IN (
        'rascunho',
        'pronta',
        'processando',
        'autorizada',
        'rejeitada',
        'cancelamento_pendente',
        'cancelada',
        'denegada',
        'importada',
        'erro_integracao'
      )
    ),
  status_sefaz VARCHAR(20),
  recibo VARCHAR(20),
  protocolo VARCHAR(30),
  ambiente_nfe CHAR(1) NOT NULL DEFAULT '2' CHECK (ambiente_nfe IN ('1', '2')),
  valor_produtos NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_acrescimo NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal.nfe_item (
  nfe_item_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenant(tenant_id) ON DELETE CASCADE,
  nfe_id INTEGER NOT NULL REFERENCES fiscal.nfe(nfe_id) ON DELETE CASCADE,
  pedido_venda_item_id INTEGER REFERENCES public.pedido_venda_item(pedido_venda_item_id) ON DELETE SET NULL,
  produto_id INTEGER REFERENCES public.produto(produto_id),
  codigo_produto VARCHAR(60) NOT NULL,
  descricao VARCHAR(180) NOT NULL,
  ncm VARCHAR(8),
  cest VARCHAR(7),
  cfop VARCHAR(4),
  unidade_comercial VARCHAR(10),
  quantidade NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_unitario NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor_desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_acrescimo NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  origem_mercadoria VARCHAR(1),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal.nfe_item_imposto (
  nfe_item_imposto_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenant(tenant_id) ON DELETE CASCADE,
  nfe_id INTEGER NOT NULL REFERENCES fiscal.nfe(nfe_id) ON DELETE CASCADE,
  nfe_item_id INTEGER NOT NULL REFERENCES fiscal.nfe_item(nfe_item_id) ON DELETE CASCADE,
  icms_cst VARCHAR(3),
  icms_csosn VARCHAR(3),
  icms_aliquota NUMERIC(9,4),
  icms_base NUMERIC(14,2),
  icms_valor NUMERIC(14,2),
  pis_cst VARCHAR(2),
  pis_aliquota NUMERIC(9,4),
  pis_valor NUMERIC(14,2),
  cofins_cst VARCHAR(2),
  cofins_aliquota NUMERIC(9,4),
  cofins_valor NUMERIC(14,2),
  ipi_cst VARCHAR(2),
  ipi_aliquota NUMERIC(9,4),
  ipi_valor NUMERIC(14,2),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal.nfe_evento (
  nfe_evento_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenant(tenant_id) ON DELETE CASCADE,
  nfe_id INTEGER NOT NULL REFERENCES fiscal.nfe(nfe_id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES public.usuario(usuario_id),
  tipo_evento VARCHAR(40) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pendente_integracao',
  mensagem TEXT,
  payload_json JSONB,
  resposta_json JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal.nfe_xml (
  nfe_xml_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenant(tenant_id) ON DELETE CASCADE,
  nfe_id INTEGER REFERENCES fiscal.nfe(nfe_id) ON DELETE CASCADE,
  tipo_xml VARCHAR(30) NOT NULL
    CHECK (tipo_xml IN ('pre_envio', 'retorno_autorizacao', 'autorizado', 'cancelamento', 'importado')),
  chave_acesso VARCHAR(44),
  conteudo_xml TEXT NOT NULL,
  hash_sha256 VARCHAR(64),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal.nfe_importacao_xml (
  nfe_importacao_xml_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenant(tenant_id) ON DELETE CASCADE,
  nfe_id INTEGER REFERENCES fiscal.nfe(nfe_id) ON DELETE SET NULL,
  usuario_id INTEGER REFERENCES public.usuario(usuario_id),
  chave_acesso VARCHAR(44),
  origem VARCHAR(80),
  conteudo_xml TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fiscal_nfe_chave_unica
  ON fiscal.nfe (tenant_id, chave_acesso)
  WHERE chave_acesso IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_tenant_status
  ON fiscal.nfe (tenant_id, status, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_pedido
  ON fiscal.nfe (tenant_id, pedido_venda_id);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_item_nfe
  ON fiscal.nfe_item (tenant_id, nfe_id);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_evento_nfe
  ON fiscal.nfe_evento (tenant_id, nfe_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_xml_nfe
  ON fiscal.nfe_xml (tenant_id, nfe_id, criado_em DESC);

DROP TRIGGER IF EXISTS trg_fiscal_nfe_updated_at ON fiscal.nfe;
CREATE TRIGGER trg_fiscal_nfe_updated_at
BEFORE UPDATE ON fiscal.nfe
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_fiscal_nfe_item_updated_at ON fiscal.nfe_item;
CREATE TRIGGER trg_fiscal_nfe_item_updated_at
BEFORE UPDATE ON fiscal.nfe_item
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_fiscal_nfe_item_imposto_updated_at ON fiscal.nfe_item_imposto;
CREATE TRIGGER trg_fiscal_nfe_item_imposto_updated_at
BEFORE UPDATE ON fiscal.nfe_item_imposto
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_fiscal_nfe_evento_updated_at ON fiscal.nfe_evento;
CREATE TRIGGER trg_fiscal_nfe_evento_updated_at
BEFORE UPDATE ON fiscal.nfe_evento
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE fiscal.nfe ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.nfe_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.nfe_item_imposto ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.nfe_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.nfe_xml ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.nfe_importacao_xml ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fiscal_nfe_rls ON fiscal.nfe;
CREATE POLICY fiscal_nfe_rls ON fiscal.nfe
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS fiscal_nfe_item_rls ON fiscal.nfe_item;
CREATE POLICY fiscal_nfe_item_rls ON fiscal.nfe_item
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS fiscal_nfe_item_imposto_rls ON fiscal.nfe_item_imposto;
CREATE POLICY fiscal_nfe_item_imposto_rls ON fiscal.nfe_item_imposto
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS fiscal_nfe_evento_rls ON fiscal.nfe_evento;
CREATE POLICY fiscal_nfe_evento_rls ON fiscal.nfe_evento
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS fiscal_nfe_xml_rls ON fiscal.nfe_xml;
CREATE POLICY fiscal_nfe_xml_rls ON fiscal.nfe_xml
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);

DROP POLICY IF EXISTS fiscal_nfe_importacao_xml_rls ON fiscal.nfe_importacao_xml;
CREATE POLICY fiscal_nfe_importacao_xml_rls ON fiscal.nfe_importacao_xml
  USING (tenant_id = current_setting('app.tenant_id', true)::INTEGER)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::INTEGER);
