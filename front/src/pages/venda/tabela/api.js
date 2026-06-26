import { api } from "api/axiosConfig";

export const getVendas = async (page, limit, search, sort) => {
  const { data } = await api.get("/venda/listar", {
    params: {
      page,
      limit,
      search,
      sort: JSON.stringify(sort || {}),
    },
  });

  return data;
};

export const deleteVenda = async (vendaId) => {
  const { data } = await api.delete(`/venda/${vendaId}`);
  return data;
};

export const generateBoletoVenda = async (vendaId) => {
  const { data } = await api.post(`/venda/${vendaId}/boletos`);
  return data;
};

export const sendBoletoWhatsAppVenda = async (financeiroTituloId) => {
  const { data } = await api.post(`/financeiro/${financeiroTituloId}/enviar-whatsapp/boleto`);
  return data;
};
