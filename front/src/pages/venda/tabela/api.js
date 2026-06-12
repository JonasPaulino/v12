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
