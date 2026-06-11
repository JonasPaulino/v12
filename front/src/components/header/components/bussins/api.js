import { api } from "api/axiosConfig";

export const switchTenant = async (tenantId) => {
  const { data } = await api.post("/tenant/switch", { tenantId });
  return data;
};
