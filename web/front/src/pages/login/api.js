import { api } from "api/axiosConfig";

export const loginRequest = async (username, password) => {
  const { data } = await api.post("/auth/login", { username, password });
  return data;
};
