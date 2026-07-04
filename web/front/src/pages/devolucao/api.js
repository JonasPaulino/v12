import { api } from "api/axiosConfig";

export const criarDevolucao = async (payload = {}) => {
  const { data } = await api.post("/devolucao-mercadoria", payload);
  return data;
};

export const getDevolucao = async (devolucaoId) => {
  const { data } = await api.get(`/devolucao-mercadoria/${devolucaoId}`);
  return data;
};

export const atualizarDevolucao = async (devolucaoId, payload = {}) => {
  const { data } = await api.put(`/devolucao-mercadoria/${devolucaoId}`, payload);
  return data;
};

export const cancelarDevolucao = async (devolucaoId) => {
  const { data } = await api.post(`/devolucao-mercadoria/${devolucaoId}/cancelar`);
  return data;
};

export const searchOrigensDevolucao = async (tipo = "venda", search = "", limit = 20) => {
  const { data } = await api.get("/devolucao-mercadoria/origens-select", {
    params: {
      tipo,
      search,
      limit,
    },
  });
  return data;
};

export const getOrigemDevolucao = async (tipo = "venda", origemId) => {
  const { data } = await api.get(`/devolucao-mercadoria/origem/${tipo}/${origemId}`);
  return data;
};
