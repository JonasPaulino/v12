import { api } from "api/axiosConfig";

const isFormData = (payload) =>
  typeof FormData !== "undefined" && payload instanceof FormData;

const requestConfig = (payload) =>
  isFormData(payload)
    ? {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    : undefined;

export const listTenants = async () => {
  const { data } = await api.get("/tenant");
  return data;
};

export const getTenantSetup = async (tenantId) => {
  const { data } = await api.get(`/tenant-setup/${tenantId}`);
  return data;
};

export const previewTenantCertificate = async ({ certificadoBase64, certificadoSenha }) => {
  const { data } = await api.post("/tenant-certificate/preview", {
    certificado: {
      conteudo_base64: certificadoBase64,
      senha: certificadoSenha,
    },
  });
  return data;
};

export const createTenantSetup = async (payload) => {
  const { data } = await api.post("/tenant-setup", payload, requestConfig(payload));
  return data;
};

export const updateTenantSetup = async (tenantId, payload) => {
  const { data } = await api.put(
    `/tenant-setup/${tenantId}`,
    payload,
    requestConfig(payload)
  );
  return data;
};

export const toggleTenantSetupStatus = async (tenantId, tenantAtivo) => {
  const { data } = await api.patch(`/tenant-setup/${tenantId}/status`, {
    tenant_ativo: tenantAtivo,
  });
  return data;
};
