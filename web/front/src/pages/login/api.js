import { api } from "api/axiosConfig";

export const loginRequest = async (email, password) => {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
};
