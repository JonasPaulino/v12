import { api } from "api/axiosConfig";

export const getProdutos = async (page, limit, search, sort) => {
  const { data } = await api.get("/produto/listar", {
    params: {
      page,
      limit,
      search,
      sort: JSON.stringify(sort || {}),
    },
  });

  return data;
};

export const deleteProduto = async (produtoId) => {
  const { data } = await api.delete(`/produto/${produtoId}`);
  return data;
};
