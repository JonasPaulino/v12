CREATE SCHEMA IF NOT EXISTS payments;

CREATE TABLE IF NOT EXISTS payments.gateway_customer (
  gateway_customer_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  provider VARCHAR(30) NOT NULL,
  pessoa_id INTEGER NOT NULL,
  external_customer_id VARCHAR(80) NOT NULL,
  external_reference VARCHAR(120),
  nome VARCHAR(180) NOT NULL,
  documento VARCHAR(20),
  payload JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, provider, pessoa_id),
  UNIQUE (provider, external_customer_id)
);

CREATE TABLE IF NOT EXISTS payments.gateway_charge (
  gateway_charge_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  provider VARCHAR(30) NOT NULL,
  financeiro_titulo_id INTEGER NOT NULL,
  financeiro_titulo_parcela_id INTEGER,
  financeiro_forma_pagamento_id INTEGER,
  pessoa_id INTEGER NOT NULL,
  external_charge_id VARCHAR(80) NOT NULL,
  external_customer_id VARCHAR(80) NOT NULL,
  external_reference VARCHAR(160) NOT NULL,
  billing_type VARCHAR(20) NOT NULL,
  status VARCHAR(40) NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  invoice_url TEXT,
  pix_payload TEXT,
  pix_encoded_image TEXT,
  pix_expiration_date TIMESTAMPTZ,
  settled BOOLEAN NOT NULL DEFAULT FALSE,
  settled_at TIMESTAMPTZ,
  payload JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, external_charge_id),
  UNIQUE (provider, external_reference)
);

CREATE TABLE IF NOT EXISTS payments.gateway_event (
  gateway_event_id SERIAL PRIMARY KEY,
  tenant_id INTEGER,
  provider VARCHAR(30) NOT NULL,
  external_event_id VARCHAR(120) NOT NULL,
  external_charge_id VARCHAR(80),
  event_name VARCHAR(80) NOT NULL,
  payload JSONB,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE (provider, external_event_id)
);

CREATE INDEX IF NOT EXISTS idx_gateway_customer_tenant
  ON payments.gateway_customer (tenant_id, provider, pessoa_id);

CREATE INDEX IF NOT EXISTS idx_gateway_charge_tenant
  ON payments.gateway_charge (tenant_id, provider, financeiro_titulo_id, settled);

CREATE INDEX IF NOT EXISTS idx_gateway_charge_external
  ON payments.gateway_charge (provider, external_charge_id);

CREATE INDEX IF NOT EXISTS idx_gateway_event_charge
  ON payments.gateway_event (provider, external_charge_id, processed);

DROP TRIGGER IF EXISTS trg_gateway_customer_updated_at ON payments.gateway_customer;
CREATE TRIGGER trg_gateway_customer_updated_at
BEFORE UPDATE ON payments.gateway_customer
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_gateway_charge_updated_at ON payments.gateway_charge;
CREATE TRIGGER trg_gateway_charge_updated_at
BEFORE UPDATE ON payments.gateway_charge
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
