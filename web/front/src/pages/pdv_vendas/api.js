import { api } from "api/axiosConfig";

export async function listPdvVendas(params = {}) {
  const { data } = await api.get("/pdv/vendas", { params });
  return data;
}

export async function getPdvVenda(id) {
  const { data } = await api.get(`/pdv/vendas/${id}`);
  return data;
}
