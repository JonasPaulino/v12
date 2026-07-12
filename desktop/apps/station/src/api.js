const LOCAL_API_URL = import.meta.env.VITE_LOCAL_API_URL || "http://127.0.0.1:5100/api/local";

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
    throw new Error(data.message || `Falha local ${response.status}`);
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
  caixaAtual: () => request("/caixa/atual"),
  caixaResumo: () => request("/caixa/resumo"),
  abrirCaixa: (payload) => request("/caixa/abrir", { method: "POST", body: JSON.stringify(payload) }),
  movimentoCaixa: (payload) =>
    request("/caixa/movimento", { method: "POST", body: JSON.stringify(payload) }),
  fecharCaixa: (payload) => request("/caixa/fechar", { method: "POST", body: JSON.stringify(payload) }),
  produtos: (search = "") => request(`/produtos?search=${encodeURIComponent(search)}`),
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
  criarVenda: (payload) => request("/vendas", { method: "POST", body: JSON.stringify(payload) }),
  syncPendencias: () => request("/sync/pendencias"),
  processarSync: () => request("/sync/processar", { method: "POST" }),
  atualizarPdvCompleto: () => request("/sync/atualizar-pdv", { method: "POST" }),
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
