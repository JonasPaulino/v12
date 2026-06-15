import { acbrApi } from "api/axiosConfig";

export const getNfes = async (page, limit, search, status, sort) => {
  const { data } = await acbrApi.get("/nfe/listar", {
    params: {
      page,
      limit,
      search,
      status,
      sort: JSON.stringify(sort || {}),
    },
  });

  return data;
};

export const getNfeSupportData = async () => {
  const { data } = await acbrApi.get("/nfe/support-data");
  return data;
};

export const getPedidosEmitirSelect = async (search = "") => {
  const { data } = await acbrApi.get("/nfe/pedidos-select", {
    params: {
      search,
      limit: 20,
    },
  });

  return data;
};

export const emitirNfe = async (payload) => {
  const { data } = await acbrApi.post("/nfe/emitir", payload);
  return data;
};

export const importarXmlNfe = async (payload) => {
  const { data } = await acbrApi.post("/nfe/importar-xml", payload);
  return data;
};

export const processarNfe = async (nfeId) => {
  const { data } = await acbrApi.post(`/nfe/${nfeId}/processar`);
  return data;
};

export const consultarStatusNfe = async (nfeId) => {
  const { data } = await acbrApi.post(`/nfe/${nfeId}/consultar-status`);
  return data;
};

export const cancelarNfe = async (nfeId, justificativa) => {
  const { data } = await acbrApi.post(`/nfe/${nfeId}/cancelar`, {
    justificativa,
  });
  return data;
};
