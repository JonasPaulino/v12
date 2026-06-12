import { api } from "api/axiosConfig";

export const getSupportData = async (tipo = "receber") => {
  const { data } = await api.get("/financeiro/support-data", {
    params: { tipo },
  });

  return data;
};

export const searchPessoasSelect = async (search = "", limit = 20) => {
  const { data } = await api.get("/financeiro/pessoas-select", {
    params: {
      search,
      limit,
    },
  });

  return data;
};

export const createTituloManual = async (payload) => {
  const { data } = await api.post("/financeiro", payload);
  return data;
};
