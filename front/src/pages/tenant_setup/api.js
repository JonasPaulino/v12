import { api, acbrApi } from "api/axiosConfig";

export const previewTenantCompany = async (payload) => {
  const { data } = await acbrApi.post("/setup/company-preview", payload);
  return data;
};

export const createTenantSetup = async (payload) => {
  const { data } = await api.post("/tenant-setup", payload);
  return data;
};
