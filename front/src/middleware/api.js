import { api } from "api/axiosConfig";

export const checkTokenValidity = async () => {
  try {
    const { data } = await api.get("/auth/validar-token");

    if (data?.valid) {
      return {
        valid: true,
        user: data.user || null,
        tenant: data.tenant || null,
        tenants: data.tenants || [],
      };
    }

    return { valid: false, reason: "expired" };
  } catch (error) {
    return { valid: false, reason: "error", error };
  }
};

export const changeFirstPassword = async (password) => {
  const { data } = await api.post("/auth/change-password", { password });
  return data;
};
