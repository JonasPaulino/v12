import { api } from "api/axiosConfig";

export async function listPdvCaixas(params = {}) {
  const { data } = await api.get("/pdv/caixas", { params });
  return data;
}

export async function getPdvCaixa(id) {
  const { data } = await api.get(`/pdv/caixas/${id}`);
  return data;
}
