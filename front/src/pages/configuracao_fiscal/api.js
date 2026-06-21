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

export const createWhatsAppInstance = async (payload = {}) => {
  const { data } = await api.post("/integracoes/mensagens/whatsapp/instance", payload);
  return data;
};

export const getWhatsAppStatus = async (instanceName = "") => {
  const { data } = await api.get("/integracoes/mensagens/whatsapp/status", {
    params: instanceName ? { instance_name: instanceName } : {},
  });
  return data;
};

export const getWhatsAppQrCode = async (instanceName = "") => {
  const { data } = await api.get("/integracoes/mensagens/whatsapp/qrcode", {
    params: instanceName ? { instance_name: instanceName } : {},
  });
  return data;
};

export const restartWhatsAppInstance = async (payload = {}) => {
  const { data } = await api.put("/integracoes/mensagens/whatsapp/restart", payload);
  return data;
};

export const logoutWhatsAppInstance = async (instanceName = "") => {
  const { data } = await api.delete("/integracoes/mensagens/whatsapp/logout", {
    data: instanceName ? { instance_name: instanceName } : {},
  });
  return data;
};

export const deleteWhatsAppInstance = async (instanceName = "") => {
  const { data } = await api.delete("/integracoes/mensagens/whatsapp/instance", {
    data: instanceName ? { instance_name: instanceName } : {},
  });
  return data;
};
