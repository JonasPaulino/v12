import { acbrApi, api } from "api/axiosConfig";

const withListParams = (page, limit, search, sort) => ({
  page,
  limit,
  search,
  ...(sort ? { sort: JSON.stringify(sort || {}) } : {}),
});

export const listManifestosMdfe = async (page, limit, search, sort) => {
  const { data } = await api.get("/mdfe/manifestos", {
    params: withListParams(page, limit, search, sort),
  });
  return data;
};

export const getManifestoMdfe = async (id) => {
  const { data } = await api.get(`/mdfe/manifestos/${id}`);
  return data;
};

export const saveManifestoMdfe = async (payload, id = null) => {
  const { data } = id
    ? await api.put(`/mdfe/manifestos/${id}`, payload)
    : await api.post("/mdfe/manifestos", payload);
  return data;
};

export const deleteManifestoMdfe = async (id) => {
  const { data } = await api.delete(`/mdfe/manifestos/${id}`);
  return data;
};

export const listVeiculosMdfe = async (page, limit, search) => {
  const { data } = await api.get("/mdfe/veiculos", {
    params: withListParams(page, limit, search),
  });
  return data;
};

export const listVeiculosMdfeSelect = async (search = "", limit = 50) => {
  const { data } = await api.get("/mdfe/veiculos-select", {
    params: { search, limit },
  });
  return data;
};

export const saveVeiculoMdfe = async (payload, id = null) => {
  const { data } = id
    ? await api.put(`/mdfe/veiculos/${id}`, payload)
    : await api.post("/mdfe/veiculos", payload);
  return data;
};

export const deleteVeiculoMdfe = async (id) => {
  const { data } = await api.delete(`/mdfe/veiculos/${id}`);
  return data;
};

export const listMotoristasMdfe = async (page, limit, search) => {
  const { data } = await api.get("/mdfe/motoristas", {
    params: withListParams(page, limit, search),
  });
  return data;
};

export const listMotoristasMdfeSelect = async (search = "", limit = 50) => {
  const { data } = await api.get("/mdfe/motoristas-select", {
    params: { search, limit },
  });
  return data;
};

export const saveMotoristaMdfe = async (payload, id = null) => {
  const { data } = id
    ? await api.put(`/mdfe/motoristas/${id}`, payload)
    : await api.post("/mdfe/motoristas", payload);
  return data;
};

export const deleteMotoristaMdfe = async (id) => {
  const { data } = await api.delete(`/mdfe/motoristas/${id}`);
  return data;
};

export const listSeguradorasMdfe = async (page, limit, search) => {
  const { data } = await api.get("/mdfe/seguradoras", {
    params: withListParams(page, limit, search),
  });
  return data;
};

export const saveSeguradoraMdfe = async (payload, id = null) => {
  const { data } = id
    ? await api.put(`/mdfe/seguradoras/${id}`, payload)
    : await api.post("/mdfe/seguradoras", payload);
  return data;
};

export const deleteSeguradoraMdfe = async (id) => {
  const { data } = await api.delete(`/mdfe/seguradoras/${id}`);
  return data;
};

export const consultarStatusServicoMdfe = async () => {
  const { data } = await acbrApi.post("/mdfe/status-servico");
  return data;
};

export const processarManifestoMdfe = async (id) => {
  const { data } = await acbrApi.post(`/mdfe/${id}/processar`);
  return data;
};
