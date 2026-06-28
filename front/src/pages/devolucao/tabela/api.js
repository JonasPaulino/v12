import { api } from "api/axiosConfig";

export const getDevolucoes = async (page = 1, limit = 12, search = "", sort = {}) => {
  const { data } = await api.get("/devolucao-mercadoria", {
    params: {
      page,
      limit,
      search,
      sort: JSON.stringify(sort || {}),
    },
  });

  return data;
};
