import { api } from "api/axiosConfig";

export const getConfiguracaoFiscal = async () => {
  const { data } = await api.get("/configuracao-fiscal");
  return data;
};

export const getPessoasEmitenteSelect = async (search = "") => {
  const { data } = await api.get("/configuracao-fiscal/pessoas-select", {
    params: {
      search,
      limit: 20,
    },
  });

  return data;
};

export const updateConfiguracaoFiscal = async (payload) => {
  const { data } = await api.put("/configuracao-fiscal", payload);
  return data;
};
