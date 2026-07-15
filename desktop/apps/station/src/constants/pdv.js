export function getModuleForCaixa(caixaData) {
  if (caixaData?.caixa_pendente_dia_anterior) return "fechamento";
  return caixaData ? "venda" : "abertura";
}

export const LIMITE_IDENTIFICACAO_CLIENTE = 10000;

export const FALLBACK_FINANCEIRO_SUPPORT_DATA = {
  condicoesPagamento: [],
  condicaoPagamentoPadrao: null,
  formasPagamento: [
    { codigo: "dinheiro", descricao: "Dinheiro", padrao: true },
    { codigo: "pix", descricao: "Pix", padrao: false },
    { codigo: "debito", descricao: "Cartao de debito", padrao: false },
    { codigo: "credito", descricao: "Cartao de credito", padrao: false },
    { codigo: "outros", descricao: "Outros", padrao: false },
  ],
  formaPagamentoPadrao: { codigo: "dinheiro", descricao: "Dinheiro", padrao: true },
};

export const BREADCRUMB_BY_MODULE = {
  abertura: "Caixa > Abertura",
  venda: "Vendas > Registro de item",
  sangria: "Caixa > Sangria",
  suprimento: "Caixa > Suprimento",
  fechamento: "Caixa > Fechamento",
  configuracao: "Sistema > Configuracoes locais",
  historico_vendas: "Vendas > Reimpressao e cancelamento",
  pedidos_pendentes: "Pedidos > Pendentes",
};
