import { api } from "api/axiosConfig";

export const getTitulosFinanceiros = async (page, limit, search, tipo, status, sort) => {
  const { data } = await api.get("/financeiro/listar", {
    params: {
      page,
      limit,
      search,
      tipo,
      status,
      sort: JSON.stringify(sort || {}),
    },
  });

  return data;
};

export const getSupportData = async (tipo = "receber") => {
  const { data } = await api.get("/financeiro/support-data", {
    params: {
      tipo,
    },
  });

  return data;
};

export const getTituloFinanceiroById = async (financeiroTituloId) => {
  const { data } = await api.get(`/financeiro/${financeiroTituloId}`);
  return data;
};

export const cancelarTituloFinanceiro = async (financeiroTituloId) => {
  const { data } = await api.post(`/financeiro/${financeiroTituloId}/cancelar`);
  return data;
};

export const registrarBaixaFinanceira = async (financeiroTituloId, payload) => {
  const { data } = await api.post(`/financeiro/${financeiroTituloId}/baixas`, payload);
  return data;
};

export const estornarBaixaFinanceira = async (financeiroTituloBaixaId) => {
  const { data } = await api.post(`/financeiro/baixas/${financeiroTituloBaixaId}/estornar`);
  return data;
};

export const gerarCobrancaPixFinanceira = async (financeiroTituloId, payload) => {
  const { data } = await api.post(`/financeiro/${financeiroTituloId}/cobrancas/pix`, payload);
  return data;
};
