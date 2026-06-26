import axios from "axios";
import { env } from "./env.js";

if (!env.evolutionApiKey) {
  console.warn("[message] EVOLUTION_API_KEY não definido.");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const retryableCodes = new Set(["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN"]);

export const evolutionClient = axios.create({
  baseURL: env.evolutionApiBaseUrl,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    apikey: env.evolutionApiKey,
  },
});

evolutionClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;
    const retryable = !error?.response && retryableCodes.has(error?.code);

    if (!config || !retryable) {
      throw error;
    }

    config.__retryCount = Number(config.__retryCount || 0) + 1;

    if (config.__retryCount > 6) {
      throw error;
    }

    await sleep(1200 * config.__retryCount);
    return evolutionClient(config);
  }
);
