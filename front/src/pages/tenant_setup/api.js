import { api, acbrApi } from "api/axiosConfig";

export const previewTenantCompany = async ({
  certificadoArrayBuffer,
  certificadoSenha,
  uf,
  ambiente = "2",
}) => {
  const { data } = await acbrApi.post("/setup/company-preview", certificadoArrayBuffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Certificado-Senha": certificadoSenha,
      "X-Uf-Consulta": uf,
      "X-Ambiente": ambiente,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  return data;
};

export const createTenantSetup = async (payload) => {
  const { data } = await api.post("/tenant-setup", payload);
  return data;
};
