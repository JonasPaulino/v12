import { api } from "api/axiosConfig";

export const getSupportData = async () => {
  const { data } = await api.get("/produto/support-data");
  return data;
};

export const getProdutoById = async (produtoId) => {
  const { data } = await api.get(`/produto/${produtoId}`);
  return data;
};

export const createProduto = async (payload) => {
  const { data } = await api.post("/produto", payload);
  return data;
};

export const updateProduto = async (produtoId, payload) => {
  const { data } = await api.put(`/produto/${produtoId}`, payload);
  return data;
};
