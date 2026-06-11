import { api } from "api/axiosConfig";

export const getSupportData = async () => {
  const { data } = await api.get("/usuario/support-data");
  return data;
};

export const getUsuarioById = async (usuarioId) => {
  const { data } = await api.get(`/usuario/${usuarioId}`);
  return data;
};

export const createUsuario = async (payload) => {
  const { data } = await api.post("/usuario", payload);
  return data;
};

export const updateUsuario = async (usuarioId, payload) => {
  const { data } = await api.put(`/usuario/${usuarioId}`, payload);
  return data;
};
