import dotenv from "dotenv";

dotenv.config();

const parseNumber = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const env = {
  port: parseNumber(process.env.PORT, 4300),
  evolutionApiBaseUrl: process.env.EVOLUTION_API_BASE_URL || "http://evolution-api:8080",
  evolutionApiKey: process.env.EVOLUTION_API_KEY || "",
  evolutionDefaultInstance: process.env.EVOLUTION_DEFAULT_INSTANCE || "v12-main",
  serviceToken: process.env.SERVICE_TOKEN || "",
};
