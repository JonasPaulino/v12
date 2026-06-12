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
