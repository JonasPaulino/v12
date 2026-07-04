import { api } from "api/axiosConfig";

export const getCompras = async (page = 1, limit = 12, search = "", sort = {}) => {
  const { data } = await api.get("/compra", {
    params: {
      page,
      limit,
      search,
      sort: JSON.stringify(sort || {}),
    },
  });
  return data;
};

export const deleteCompra = async (compraId) => {
  const { data } = await api.delete(`/compra/${compraId}`);
  return data;
};

