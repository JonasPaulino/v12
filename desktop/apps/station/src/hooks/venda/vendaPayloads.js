function mapPagamentosWithDescricao(pagamentos = [], formasPagamento = []) {
  return pagamentos.map((item) => {
    const forma = formasPagamento.find((formaPagamento) => formaPagamento.codigo === item.forma);
    return {
      ...item,
      descricao: forma?.descricao || item.forma,
    };
  });
}

function buildEmitente(config) {
  return {
    nome: config?.tenant_nome || "V12 ERP",
    documento: config?.tenant_documento || "",
    endereco: config?.tenant_endereco || "",
    inscricaoEstadual: config?.tenant_inscricao_estadual || "",
    inscricaoMunicipal: config?.tenant_inscricao_municipal || "",
  };
}

function buildOperadorResumo({ operador, caixa }) {
  return operador?.nome || caixa?.operador_nome || "Operador";
}

function buildTerminalResumo(config) {
  return config?.terminal_codigo || config?.terminal_nome || "PDV";
}

export function buildBudgetPayload({
  items = [],
  subtotal = 0,
  descontoCalculado = 0,
  total = 0,
  pagamentosConfirmados = [],
  formasPagamento = [],
  clienteResumo = null,
  operador,
  caixa,
  config,
}) {
  return {
    items,
    subtotal,
    desconto: descontoCalculado,
    total,
    pagamentos: Array.isArray(pagamentosConfirmados)
      ? mapPagamentosWithDescricao(pagamentosConfirmados, formasPagamento)
      : [],
    cliente: clienteResumo || "Consumidor não identificado",
    operador: buildOperadorResumo({ operador, caixa }),
    data: new Date().toLocaleString("pt-BR"),
    terminal: buildTerminalResumo(config),
    emitente: buildEmitente(config),
    numeroDocumento: `ORC-${Date.now()}`,
  };
}

export function buildBudgetPayloadFromVenda({
  vendaSalva,
  cart = [],
  subtotal = 0,
  descontoCalculado = 0,
  total = 0,
  pagamentosConfirmados = [],
  formasPagamento = [],
  clienteResumo = null,
  operador,
  caixa,
  config,
}) {
  return {
    items: Array.isArray(vendaSalva?.itens)
      ? vendaSalva.itens.map((item) => ({
          produto_id: item.produto_id,
          codigo_produto: item.codigo_produto,
          descricao: item.descricao,
          quantidade: Number(item.quantidade || 0),
          valor_unitario: Number(item.valor_unitario || 0),
          unidade: item.unidade || "UN",
        }))
      : cart.map((item) => ({ ...item })),
    subtotal: Number(vendaSalva?.total_produtos ?? subtotal ?? 0),
    desconto: Number(vendaSalva?.total_desconto ?? descontoCalculado ?? 0),
    total: Number(vendaSalva?.total_liquido ?? total ?? 0),
    pagamentos: Array.isArray(vendaSalva?.pagamentos)
      ? mapPagamentosWithDescricao(vendaSalva.pagamentos, formasPagamento)
      : mapPagamentosWithDescricao(pagamentosConfirmados, formasPagamento),
    cliente: vendaSalva?.cliente_nome || clienteResumo || "Consumidor não identificado",
    operador: vendaSalva?.operador_nome || buildOperadorResumo({ operador, caixa }),
    data: vendaSalva?.concluida_em || vendaSalva?.criada_em || new Date().toLocaleString("pt-BR"),
    terminal: vendaSalva?.terminal_codigo || buildTerminalResumo(config),
    emitente: buildEmitente(config),
    numeroDocumento: `ORC-${String(vendaSalva?.venda_id || Date.now()).padStart(6, "0")}`,
  };
}
