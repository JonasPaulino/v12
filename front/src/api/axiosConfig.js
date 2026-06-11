import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";

    if (status === 401 && !url.includes("/auth/validar-token")) {
      document.dispatchEvent(
        new CustomEvent("app:unauthorized", {
          detail: {
            url: url || null,
          },
        })
      );
    }

    return Promise.reject(error);
  }
);
