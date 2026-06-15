import axios from "axios";

const createApiClient = (baseURL) => {
  const client = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.response.use(
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

  return client;
};

export const api = createApiClient(import.meta.env.VITE_API_URL || "/api");
export const acbrApi = createApiClient(
  import.meta.env.VITE_ACBR_API_URL || "http://localhost:4100"
);
