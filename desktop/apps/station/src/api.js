function getDefaultLocalApiUrl() {
  const hostname = window.location?.hostname;
  if (hostname) {
    return `http://${hostname}:5100/api/local`;
  }

  return "http://127.0.0.1:5100/api/local";
}

const LOCAL_API_URL = import.meta.env.VITE_LOCAL_API_URL || getDefaultLocalApiUrl();

async function request(path, options = {}) {
  const response = await fetch(`${LOCAL_API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    const error = new Error(data.message || `Falha local ${response.status}`);
    error.status = response.status;
    error.code = data.code || null;
    error.data = Object.prototype.hasOwnProperty.call(data, "data") ? data.data : null;
    throw error;
  }

  if (Object.prototype.hasOwnProperty.call(data, "data")) {
    return data.data;
  }

  return data;
}

export const api = {
  health: () => request("/healthz"),
  configuracaoStatus: () => request("/configuracao/status"),
  obterConfiguracaoImpressora: () => request("/configuracao/impressora"),
  salvarConfiguracaoImpressora: (payload) =>
    request("/configuracao/impressora", { method: "PUT", body: JSON.stringify(payload) }),
  loginWeb: (payload) =>
    request("/configuracao/login-web", { method: "POST", body: JSON.stringify(payload) }),
  setupWeb: (payload) =>
    request("/configuracao/setup-web", { method: "POST", body: JSON.stringify(payload) }),
  sincronizarFilial: () =>
    request("/configuracao/sincronizar-filial", { method: "POST" }),
  loginOperador: (payload) =>
    request("/operadores/login", { method: "POST", body: JSON.stringify(payload) }),
  trocarSenhaPrimeiroAcesso: (payload) =>
    request("/operadores/primeiro-acesso", { method: "POST", body: JSON.stringify(payload) }),
  chatConfig: () => request("/chat/config"),
  chatIniciarAtendimento: (payload) =>
    request("/chat/atendimentos", { method: "POST", body: JSON.stringify(payload) }),
  chatAtendimento: (token) => request(`/chat/atendimentos/${encodeURIComponent(token)}`),
  chatEnviarMensagem: (token, payload) =>
    request(`/chat/atendimentos/${encodeURIComponent(token)}/mensagens`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  chatAvaliarAtendimento: (token, payload) =>
    request(`/chat/atendimentos/${encodeURIComponent(token)}/avaliacao`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  caixaAtual: () => request("/caixa/atual"),
  caixaResumo: () => request("/caixa/resumo"),
  contextoAberturaCaixa: (operadorId) =>
    request(`/caixa/contexto-abertura?operador_id=${encodeURIComponent(operadorId)}`),
  abrirCaixa: (payload) => request("/caixa/abrir", { method: "POST", body: JSON.stringify(payload) }),
  movimentoCaixa: (payload) =>
    request("/caixa/movimento", { method: "POST", body: JSON.stringify(payload) }),
  fecharCaixa: (payload) => request("/caixa/fechar", { method: "POST", body: JSON.stringify(payload) }),
  produtos: (search = "", options = {}) =>
    request(
      `/produtos?search=${encodeURIComponent(search)}&limit=${encodeURIComponent(options.limit || 50)}&strategy=${encodeURIComponent(options.strategy || "default")}`,
    ),
  pedidos: ({ status = "", search = "", limit = 80, date = "" } = {}) =>
    request(
      `/pedidos?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}&limit=${encodeURIComponent(limit)}&date=${encodeURIComponent(date)}`,
    ),
  proximoNumeroPedido: () => request("/pedidos/proximo-numero"),
  pedidoDetalhe: (pedidoId) => request(`/pedidos/${pedidoId}`),
  criarPedido: (payload) => request("/pedidos", { method: "POST", body: JSON.stringify(payload) }),
  atualizarPedido: (pedidoId, payload) =>
    request(`/pedidos/${pedidoId}`, { method: "PUT", body: JSON.stringify(payload) }),
  importarPedido: (pedidoId, payload = {}) =>
    request(`/pedidos/${pedidoId}/importar`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  cancelarPedido: (pedidoId) =>
    request(`/pedidos/${pedidoId}/cancelar`, {
      method: "POST",
    }),
  pessoas: (search = "") => request(`/pessoas?search=${encodeURIComponent(search)}`),
  vendas: ({ search = "", status = "", limit = 50 } = {}) =>
    request(
      `/vendas?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&limit=${encodeURIComponent(limit)}`,
    ),
  vendaDetalhe: (vendaId) => request(`/vendas/${vendaId}`),
  cancelarVenda: (vendaId, payload = {}) =>
    request(`/vendas/${vendaId}/cancelar`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  cancelarNfceVenda: (vendaId, payload = {}) =>
    request(`/vendas/${vendaId}/nfce/cancelar`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  descartarVendaRascunho: (vendaId) =>
    request(`/vendas/${vendaId}/descartar-rascunho`, {
      method: "POST",
    }),
  emitirVendaEmContingencia: (vendaId, payload = {}) =>
    request(`/vendas/${vendaId}/nfce/emitir-contingencia`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  transmitirVendaContingencia: (vendaId) =>
    request(`/vendas/${vendaId}/nfce/transmitir`, {
      method: "POST",
    }),
  reenviarContingenciasNfce: () =>
    request("/vendas/nfce/contingencias/enviar", {
      method: "POST",
    }),
  criarVenda: (payload) => request("/vendas", { method: "POST", body: JSON.stringify(payload) }),
  emitirCupomFiscalVenda: (vendaId, payload = {}) =>
    request(`/vendas/${vendaId}/emitir-cupom`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  syncPendencias: () => request("/sync/pendencias"),
  processarSync: () => request("/sync/processar", { method: "POST" }),
  atualizarPdvCompleto: (payload = {}) =>
    request("/sync/atualizar-pdv", {
      method: "POST",
      body: JSON.stringify({
        full: payload.full !== false,
      }),
    }),
  sincronizarProdutos: (payload = {}) =>
    request("/sync/produtos", { method: "POST", body: JSON.stringify(payload) }),
  sincronizarUsuarios: () => request("/sync/usuarios", { method: "POST" }),
  financeiroSupportData: (payload = {}) =>
    request(
      `/sync/financeiro-support-data?tipo=${encodeURIComponent(payload.tipo || "receber")}`,
    ),
  sincronizarFinanceiroSupportData: (payload = {}) =>
    request("/sync/financeiro-support-data", {
      method: "POST",
      body: JSON.stringify({
        tipo: payload.tipo || "receber",
        refresh: payload.refresh !== false,
      }),
    }),
};
