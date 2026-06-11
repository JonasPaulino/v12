import { api } from "api/axiosConfig";

export const logout = async () => {
  const { data } = await api.post("/auth/logout");
  return data;
};
