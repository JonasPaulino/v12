import { api } from "api/axiosConfig";

export const getDashboard = async () => {
  const { data } = await api.get("/dashboard");
  return data;
};
