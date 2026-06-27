import { api } from "api/axiosConfig";

export const getSupportData = async () => {
  const { data } = await api.get("/compra/support");
  return data;
};

export const searchFornecedoresSelect = async (search = "", limit = 20) => {
  const { data } = await api.get("/compra/fornecedores-select", {
    params: {
      search,
      limit,
    },
  });
  return data;
};

export const searchProdutosSelect = async (search = "", limit = 20) => {
  const { data } = await api.get("/compra/produtos-select", {
    params: {
      search,
      limit,
    },
  });
  return data;
};

export const getCompraById = async (compraId) => {
  const { data } = await api.get(`/compra/${compraId}`);
  return data;
};

export const createCompra = async (payload) => {
  const { data } = await api.post("/compra", payload);
  return data;
};

export const updateCompra = async (compraId, payload) => {
  const { data } = await api.put(`/compra/${compraId}`, payload);
  return data;
};

