export const syncStatus = Object.freeze({
  PENDENTE: "pendente",
  PROCESSANDO: "processando",
  SUCESSO: "sucesso",
  ERRO: "erro",
});

export const caixaStatus = Object.freeze({
  ABERTO: "aberto",
  FECHADO: "fechado",
});

export const vendaStatus = Object.freeze({
  RASCUNHO: "rascunho",
  CONCLUIDA: "concluida",
  CANCELADA: "cancelada",
});

export const nfceStatus = Object.freeze({
  PENDENTE: "pendente",
  AUTORIZADA: "autorizada",
  CONTINGENCIA: "contingencia",
  CANCELADA: "cancelada",
  REJEITADA: "rejeitada",
});

export const syncEventTypes = Object.freeze({
  CAIXA_ABERTO: "CAIXA_ABERTO",
  CAIXA_FECHADO: "CAIXA_FECHADO",
  CAIXA_MOVIMENTO: "CAIXA_MOVIMENTO",
  VENDA_CRIADA: "VENDA_CRIADA",
  VENDA_CANCELADA: "VENDA_CANCELADA",
  NFCE_EMITIDA: "NFCE_EMITIDA",
  NFCE_CONTINGENCIA: "NFCE_CONTINGENCIA",
  NFCE_AUTORIZADA: "NFCE_AUTORIZADA",
  NFCE_CANCELADA: "NFCE_CANCELADA",
  PESSOA_CRIADA: "PESSOA_CRIADA",
  PRODUTO_ATUALIZADO: "PRODUTO_ATUALIZADO",
});

export const formaPagamento = Object.freeze({
  DINHEIRO: "dinheiro",
  PIX: "pix",
  CREDITO: "credito",
  DEBITO: "debito",
  OUTROS: "outros",
});
