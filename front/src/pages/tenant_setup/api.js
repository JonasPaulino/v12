import { api } from "api/axiosConfig";

export const createTenantSetup = async (payload) => {
  const { data } = await api.post("/tenant-setup", payload);
  return data;
};
