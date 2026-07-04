-- Índices complementares para consultas recorrentes do backend, ACBr, payments,
-- reports e gestão V12. Todos são idempotentes para poder rodar em ambientes já
-- parcialmente migrados.

-- Autenticação, seleção de filiais e duplicidade por documento.
CREATE INDEX IF NOT EXISTS idx_usuario_login_email_lower
  ON usuario (LOWER(usuario_email))
  WHERE usuario_excluido = FALSE;

CREATE INDEX IF NOT EXISTS idx_usuario_login_username_lower
  ON usuario (LOWER(usuario_username))
  WHERE usuario_excluido = FALSE;

CREATE INDEX IF NOT EXISTS idx_usuario_tenant_usuario_ativo_tenant
  ON usuario_tenant (usuario_id, ativo, tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_documento_digits
  ON tenant (REGEXP_REPLACE(COALESCE(tenant_documento, ''), '\D', '', 'g'));

CREATE INDEX IF NOT EXISTS idx_tenant_ativo_nome
  ON tenant (tenant_ativo, tenant_nome);

-- Pessoas e endereços: duplicidade por documento normalizado e último endereço.
CREATE INDEX IF NOT EXISTS idx_pessoa_documento_digits
  ON pessoa (REGEXP_REPLACE(COALESCE(pessoa_cpf_cnpj, ''), '\D', '', 'g'))
  WHERE pessoa_excluido = FALSE;

CREATE INDEX IF NOT EXISTS idx_pessoa_tenant_tenant_ativo_pessoa
  ON pessoa_tenant (tenant_id, ativo, pessoa_id);

CREATE INDEX IF NOT EXISTS idx_pessoa_endereco_pessoa_tipo_recente
  ON pessoa_endereco (pessoa_id, endereco_tipo, atualizado_em DESC, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_pessoa_endereco_tenant_tipo
  ON pessoa_endereco (tenant_id, endereco_tipo, pessoa_id);

-- Produtos, preços e estoque.
CREATE INDEX IF NOT EXISTS idx_produto_tenant_excluido_descricao
  ON produto (tenant_id, excluido, descricao);

CREATE INDEX IF NOT EXISTS idx_produto_tenant_excluido_codigo
  ON produto (tenant_id, excluido, codigo_interno);

CREATE INDEX IF NOT EXISTS idx_tabela_preco_tenant_padrao_ativa
  ON tabela_preco (tenant_id, padrao, excluido, tabela_preco_id);

CREATE INDEX IF NOT EXISTS idx_deposito_tenant_padrao_ativo
  ON deposito (tenant_id, padrao, excluido, deposito_id);

CREATE INDEX IF NOT EXISTS idx_produto_preco_lookup_vigente
  ON produto_preco (produto_id, tabela_preco_id, ativo, data_fim, data_inicio DESC);

CREATE INDEX IF NOT EXISTS idx_produto_estoque_tenant_produto_deposito
  ON produto_estoque (tenant_id, produto_id, deposito_id);

CREATE INDEX IF NOT EXISTS idx_estoque_movimento_tenant_produto_data
  ON estoque_movimento (tenant_id, produto_id, data_movimento DESC);

-- Vendas, compras, entradas, devoluções e financeiro do ERP cliente.
CREATE INDEX IF NOT EXISTS idx_pedido_venda_tenant_status_data
  ON pedido_venda (tenant_id, status, excluido, data_emissao DESC);

CREATE INDEX IF NOT EXISTS idx_pedido_venda_item_tenant_pedido
  ON pedido_venda_item (tenant_id, pedido_venda_id, pedido_venda_item_id);

CREATE INDEX IF NOT EXISTS idx_pedido_venda_item_produto
  ON pedido_venda_item (tenant_id, produto_id);

CREATE INDEX IF NOT EXISTS idx_pedido_compra_tenant_status_data
  ON pedido_compra (tenant_id, status, excluido, data_emissao DESC);

CREATE INDEX IF NOT EXISTS idx_pedido_compra_item_tenant_pedido
  ON pedido_compra_item (tenant_id, pedido_compra_id, pedido_compra_item_id);

CREATE INDEX IF NOT EXISTS idx_pedido_compra_item_produto
  ON pedido_compra_item (tenant_id, produto_id);

CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_tenant_status_data
  ON entrada_mercadoria (tenant_id, status, excluido, data_entrada DESC);

CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_pessoa
  ON entrada_mercadoria (tenant_id, pessoa_id, excluido);

CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_item_tenant_entrada
  ON entrada_mercadoria_item (tenant_id, entrada_mercadoria_id, entrada_mercadoria_item_id);

CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_item_pedido_item
  ON entrada_mercadoria_item (tenant_id, pedido_compra_item_id)
  WHERE pedido_compra_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_item_produto
  ON entrada_mercadoria_item (tenant_id, produto_id);

CREATE INDEX IF NOT EXISTS idx_devolucao_mercadoria_tenant_status_data
  ON devolucao_mercadoria (tenant_id, status, excluido, data_devolucao DESC);

CREATE INDEX IF NOT EXISTS idx_devolucao_mercadoria_pessoa
  ON devolucao_mercadoria (tenant_id, pessoa_id, excluido);

CREATE INDEX IF NOT EXISTS idx_devolucao_item_pedido_venda_item
  ON devolucao_mercadoria_item (tenant_id, pedido_venda_item_id)
  WHERE pedido_venda_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_devolucao_item_entrada_item
  ON devolucao_mercadoria_item (tenant_id, entrada_mercadoria_item_id)
  WHERE entrada_mercadoria_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fin_titulo_tenant_pessoa_status
  ON financeiro_titulo (tenant_id, pessoa_id, tipo, status, excluido);

CREATE INDEX IF NOT EXISTS idx_fin_titulo_entrada_mercadoria_lookup
  ON financeiro_titulo (tenant_id, entrada_mercadoria_id)
  WHERE entrada_mercadoria_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fin_titulo_parcela_tenant_status_venc
  ON financeiro_titulo_parcela (tenant_id, status, data_vencimento, financeiro_titulo_id);

CREATE INDEX IF NOT EXISTS idx_fin_titulo_parcela_tenant_titulo_numero
  ON financeiro_titulo_parcela (tenant_id, financeiro_titulo_id, numero_parcela);

CREATE INDEX IF NOT EXISTS idx_fin_titulo_baixa_tenant_parcela
  ON financeiro_titulo_baixa (tenant_id, financeiro_titulo_parcela_id, estornado_em, data_baixa DESC);

-- XML de entrada e solicitações de consulta por chave.
CREATE INDEX IF NOT EXISTS idx_entrada_xml_solicitacao_tenant_status_data
  ON entrada_xml_solicitacao (tenant_id, status, atualizado_em DESC);

CREATE INDEX IF NOT EXISTS idx_entrada_xml_solicitacao_chave
  ON entrada_xml_solicitacao (tenant_id, chave_acesso);

CREATE INDEX IF NOT EXISTS idx_entrada_xml_importado_chave
  ON entrada_xml_importado (tenant_id, chave_acesso);

-- Fiscal NF-e emitida/recebida.
CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_tenant_numero
  ON fiscal.nfe (tenant_id, serie, numero)
  WHERE numero IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_tenant_emitente
  ON fiscal.nfe (tenant_id, emitente_pessoa_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_tenant_destinatario
  ON fiscal.nfe (tenant_id, destinatario_pessoa_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_xml_tenant_tipo_chave
  ON fiscal.nfe_xml (tenant_id, tipo_xml, chave_acesso, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_evento_tenant_tipo_status
  ON fiscal.nfe_evento (tenant_id, tipo_evento, status, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_item_tenant_nfe
  ON fiscal.nfe_item (tenant_id, nfe_id, nfe_item_id);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfe_item_produto
  ON fiscal.nfe_item (tenant_id, produto_id);

-- Distribuição/manifestação NF-e e notificações.
CREATE INDEX IF NOT EXISTS idx_nfe_distribuicao_controle_retry
  ON nfe_distribuicao_controle (tenant_id, ambiente, cstat, ultima_consulta_em DESC);

CREATE INDEX IF NOT EXISTS idx_nfe_recebida_distribuicao_nsu
  ON nfe_recebida_distribuicao (tenant_id, nsu)
  WHERE nsu IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nfe_recebida_distribuicao_xml_status
  ON nfe_recebida_distribuicao (tenant_id, status_xml, atualizado_em DESC);

CREATE INDEX IF NOT EXISTS idx_nfe_recebida_distribuicao_entrada
  ON nfe_recebida_distribuicao (tenant_id, entrada_mercadoria_id)
  WHERE entrada_mercadoria_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nfe_recebida_evento_status
  ON nfe_recebida_evento (tenant_id, status, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_notificacao_tenant_usuario_lida
  ON notificacao (tenant_id, usuario_id, lida, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_notificacao_tenant_tipo_lida
  ON notificacao (tenant_id, tipo, lida, criado_em DESC);

-- MDF-e e tabelas auxiliares fiscais.
CREATE INDEX IF NOT EXISTS idx_fiscal_mdfe_tenant_numero
  ON fiscal.mdfe (tenant_id, serie, numero)
  WHERE numero IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fiscal_mdfe_xml_tenant_tipo
  ON fiscal.mdfe_xml (tenant_id, mdfe_id, tipo_xml, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_fiscal_mdfe_evento_tenant_tipo_status
  ON fiscal.mdfe_evento (tenant_id, tipo_evento, status, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_fiscal_mdfe_condutor_tenant_mdfe
  ON fiscal.mdfe_condutor (tenant_id, mdfe_id, ordem, mdfe_condutor_id);

CREATE INDEX IF NOT EXISTS idx_fiscal_mdfe_reboque_tenant_mdfe
  ON fiscal.mdfe_reboque (tenant_id, mdfe_id, ordem, mdfe_reboque_id);

CREATE INDEX IF NOT EXISTS idx_fiscal_mdfe_percurso_tenant_mdfe
  ON fiscal.mdfe_percurso (tenant_id, mdfe_id, ordem, mdfe_percurso_id);

CREATE INDEX IF NOT EXISTS idx_fiscal_mdfe_descarga_tenant_mdfe
  ON fiscal.mdfe_descarga (tenant_id, mdfe_id, mdfe_descarga_id);

CREATE INDEX IF NOT EXISTS idx_fiscal_mdfe_documento_tenant_mdfe
  ON fiscal.mdfe_documento (tenant_id, mdfe_id, mdfe_documento_id);

CREATE INDEX IF NOT EXISTS idx_fiscal_mdfe_documento_nfe
  ON fiscal.mdfe_documento (tenant_id, nfe_id)
  WHERE nfe_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fiscal_mdfe_seguro_tenant_mdfe
  ON fiscal.mdfe_seguro (tenant_id, mdfe_id, mdfe_seguro_id);

CREATE INDEX IF NOT EXISTS idx_fiscal_mdfe_ciot_tenant_mdfe
  ON fiscal.mdfe_ciot (tenant_id, mdfe_id, mdfe_ciot_id);

-- Payments schema.
CREATE INDEX IF NOT EXISTS idx_payments_gateway_customer_reference
  ON payments.gateway_customer (tenant_id, provider, external_reference)
  WHERE external_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_gateway_charge_parcela
  ON payments.gateway_charge (tenant_id, provider, financeiro_titulo_parcela_id, status)
  WHERE financeiro_titulo_parcela_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_gateway_charge_pessoa
  ON payments.gateway_charge (tenant_id, provider, pessoa_id, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_gateway_charge_status_due
  ON payments.gateway_charge (tenant_id, provider, status, due_date);

CREATE INDEX IF NOT EXISTS idx_payments_gateway_event_pending
  ON payments.gateway_event (provider, processed, criado_em)
  WHERE processed = FALSE;

-- Gestão V12: clientes, pessoas, financeiro e usuários internos.
CREATE INDEX IF NOT EXISTS idx_gestao_pessoa_excluido_nome
  ON gestao.pessoa (excluido, nome_razao);

CREATE INDEX IF NOT EXISTS idx_gestao_pessoa_email
  ON gestao.pessoa (LOWER(email))
  WHERE excluido = FALSE AND email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gestao_pessoa_endereco_pessoa_tipo
  ON gestao.pessoa_endereco (pessoa_id, endereco_tipo);

CREATE INDEX IF NOT EXISTS idx_gestao_usuario_interno_ativo_perfil
  ON gestao.usuario_interno (ativo, perfil, usuario_id);

CREATE INDEX IF NOT EXISTS idx_gestao_cliente_contrato_pessoa
  ON gestao.cliente_contrato (pessoa_id, status);

CREATE INDEX IF NOT EXISTS idx_gestao_cliente_parcela_contrato_status
  ON gestao.cliente_parcela (contrato_id, status, vencimento);

CREATE INDEX IF NOT EXISTS idx_gestao_cliente_parcela_asaas_charge
  ON gestao.cliente_parcela (asaas_charge_id)
  WHERE asaas_charge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gestao_fin_titulo_pessoa_status
  ON gestao.financeiro_titulo (pessoa_id, status, excluido);

CREATE INDEX IF NOT EXISTS idx_gestao_fin_titulo_tenant_status
  ON gestao.financeiro_titulo (tenant_id, status, excluido)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gestao_fin_parcela_titulo_status
  ON gestao.financeiro_parcela (titulo_id, status, numero_parcela);

CREATE INDEX IF NOT EXISTS idx_gestao_fin_parcela_vencimento
  ON gestao.financeiro_parcela (vencimento, parcela_id DESC);

CREATE INDEX IF NOT EXISTS idx_gestao_fin_parcela_asaas_charge
  ON gestao.financeiro_parcela (asaas_charge_id)
  WHERE asaas_charge_id IS NOT NULL;
