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
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.response?.data?.msg ||
        "";
      const authRelatedMessage = /token|sess[aã]o|autentic|expir/i.test(String(message));

      if (status === 401 && !url.includes("/auth/validar-token") && authRelatedMessage) {
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
