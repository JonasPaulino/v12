import axios from "axios";
import { env } from "./env.js";

if (!env.evolutionApiKey) {
  console.warn("[message] EVOLUTION_API_KEY não definido.");
}

export const evolutionClient = axios.create({
  baseURL: env.evolutionApiBaseUrl,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    apikey: env.evolutionApiKey,
  },
});
