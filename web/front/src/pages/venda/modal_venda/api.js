import { api } from "api/axiosConfig";

export const getSupportData = async () => {
  const { data } = await api.get("/venda/support-data");
  return data;
};

export const searchPessoasSelect = async (search = "", limit = 20) => {
  const { data } = await api.get("/venda/pessoas-select", {
    params: {
      search,
      limit,
    },
  });
  return data;
};

export const searchProdutosSelect = async (search = "", limit = 20) => {
  const { data } = await api.get("/venda/produtos-select", {
    params: {
      search,
      limit,
    },
  });
  return data;
};

export const getVendaById = async (vendaId) => {
  const { data } = await api.get(`/venda/${vendaId}`);
  return data;
};

export const createVenda = async (payload) => {
  const { data } = await api.post("/venda", payload);
  return data;
};

export const updateVenda = async (vendaId, payload) => {
  const { data } = await api.put(`/venda/${vendaId}`, payload);
  return data;
};
