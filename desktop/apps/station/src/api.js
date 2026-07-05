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

  return data.data ?? data;
}

export const api = {
  health: () => request("/healthz"),
  configuracaoStatus: () => request("/configuracao/status"),
  setupLocal: (payload) =>
    request("/configuracao/setup-local", { method: "POST", body: JSON.stringify(payload) }),
  loginOperador: (payload) =>
    request("/operadores/login", { method: "POST", body: JSON.stringify(payload) }),
  caixaAtual: () => request("/caixa/atual"),
  abrirCaixa: (payload) => request("/caixa/abrir", { method: "POST", body: JSON.stringify(payload) }),
  fecharCaixa: (payload) => request("/caixa/fechar", { method: "POST", body: JSON.stringify(payload) }),
  produtos: (search = "") => request(`/produtos?search=${encodeURIComponent(search)}`),
  pessoas: (search = "") => request(`/pessoas?search=${encodeURIComponent(search)}`),
  vendas: () => request("/vendas"),
  criarVenda: (payload) => request("/vendas", { method: "POST", body: JSON.stringify(payload) }),
  syncPendencias: () => request("/sync/pendencias"),
  processarSync: () => request("/sync/processar", { method: "POST" }),
  sincronizarProdutos: (payload = {}) =>
    request("/sync/produtos", { method: "POST", body: JSON.stringify(payload) }),
};
