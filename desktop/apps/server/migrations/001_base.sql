CREATE TABLE IF NOT EXISTS config_local (
  chave TEXT PRIMARY KEY,
  valor TEXT,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pessoa (
  pessoa_id INTEGER PRIMARY KEY AUTOINCREMENT,
  erp_id INTEGER,
  nome TEXT NOT NULL,
  documento TEXT,
  telefone TEXT,
  email TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  sincronizado_em TEXT,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS produto (
  produto_id INTEGER PRIMARY KEY AUTOINCREMENT,
  erp_id INTEGER,
  codigo TEXT,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'UN',
  ncm TEXT,
  cest TEXT,
  preco_venda NUMERIC NOT NULL DEFAULT 0,
  estoque_atual NUMERIC NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  sincronizado_em TEXT,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS caixa (
  caixa_id INTEGER PRIMARY KEY AUTOINCREMENT,
  operador_nome TEXT NOT NULL,
  status TEXT NOT NULL,
  valor_abertura NUMERIC NOT NULL DEFAULT 0,
  valor_fechamento NUMERIC,
  aberto_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fechado_em TEXT
);

CREATE TABLE IF NOT EXISTS venda (
  venda_id INTEGER PRIMARY KEY AUTOINCREMENT,
  caixa_id INTEGER NOT NULL REFERENCES caixa(caixa_id),
  pessoa_id INTEGER REFERENCES pessoa(pessoa_id),
  status TEXT NOT NULL,
  total_produtos NUMERIC NOT NULL DEFAULT 0,
  total_desconto NUMERIC NOT NULL DEFAULT 0,
  total_liquido NUMERIC NOT NULL DEFAULT 0,
  criada_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  concluida_em TEXT
);

CREATE TABLE IF NOT EXISTS venda_item (
  venda_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  venda_id INTEGER NOT NULL REFERENCES venda(venda_id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produto(produto_id),
  codigo_produto TEXT,
  descricao TEXT NOT NULL,
  quantidade NUMERIC NOT NULL,
  valor_unitario NUMERIC NOT NULL,
  valor_total NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS venda_pagamento (
  pagamento_id INTEGER PRIMARY KEY AUTOINCREMENT,
  venda_id INTEGER NOT NULL REFERENCES venda(venda_id) ON DELETE CASCADE,
  forma TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  autorizado INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nfce (
  nfce_id INTEGER PRIMARY KEY AUTOINCREMENT,
  venda_id INTEGER NOT NULL REFERENCES venda(venda_id),
  status TEXT NOT NULL,
  chave_acesso TEXT,
  numero INTEGER,
  serie INTEGER,
  xml TEXT,
  protocolo TEXT,
  motivo TEXT,
  emitida_em TEXT,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sync_queue (
  sync_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo_evento TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL,
  tentativas INTEGER NOT NULL DEFAULT 0,
  ultimo_erro TEXT,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  enviado_em TEXT
);

CREATE INDEX IF NOT EXISTS idx_produto_codigo ON produto(codigo);
CREATE INDEX IF NOT EXISTS idx_produto_erp_id ON produto(erp_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_produto_erp_id_unique ON produto(erp_id) WHERE erp_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pessoa_documento ON pessoa(documento);
CREATE INDEX IF NOT EXISTS idx_venda_caixa_status ON venda(caixa_id, status);
CREATE INDEX IF NOT EXISTS idx_nfce_status ON nfce(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, criado_em);
