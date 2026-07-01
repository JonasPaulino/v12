import { api } from "api/axiosConfig";

export const getManifestacoesNfe = async (page = 1, limit = 12, search = "", sort = {}) => {
  const { data } = await api.get("/nfe-manifestacao", {
    params: {
      page,
      limit,
      search,
      sort: JSON.stringify(sort || {}),
    },
  });
  return data;
};

export const sincronizarManifestacoesNfe = async () => {
  const { data } = await api.post("/nfe-manifestacao/sincronizar");
  return data;
};

export const manifestarNfeRecebida = async (id, payload = {}) => {
  const { data } = await api.post(`/nfe-manifestacao/${id}/manifestar`, payload);
  return data;
};

export const importarXmlNfeRecebida = async (id) => {
  const { data } = await api.post(`/nfe-manifestacao/${id}/importar`);
  return data;
};
