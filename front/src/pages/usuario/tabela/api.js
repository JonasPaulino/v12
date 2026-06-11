import { api } from "api/axiosConfig";

export const getUsuarios = async (page, limit, search, sort) => {
  const { data } = await api.get("/usuario/listar", {
    params: {
      page,
      limit,
      search,
      sort: JSON.stringify(sort || {}),
    },
  });

  return data;
};

export const deleteUsuario = async (usuarioId) => {
  const { data } = await api.delete(`/usuario/${usuarioId}`);
  return data;
};
