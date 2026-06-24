import { api } from "api/axiosConfig";

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
  const { data } = await api.post("/tenant-setup", payload);
  return data;
};
