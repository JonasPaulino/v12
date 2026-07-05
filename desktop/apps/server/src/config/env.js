import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopEnvPath = path.resolve(__dirname, "../../../../.env");

dotenv.config({ path: desktopEnvPath });

const rootDir = process.cwd();

export const env = {
  port: Number(process.env.V12_LOCAL_PORT || 5100),
  dbPath: process.env.V12_LOCAL_DB_PATH || path.join(rootDir, "data", "v12-pdv.sqlite"),
  erpApiUrl: process.env.V12_ERP_API_URL || "",
  erpSyncToken: process.env.V12_ERP_SYNC_TOKEN || "",
  estacaoNome: process.env.V12_ESTACAO_NOME || "Caixa 01",
  acbrMode: process.env.V12_ACBR_MODE || "monitor",
  acbrMonitorHost: process.env.V12_ACBR_MONITOR_HOST || "127.0.0.1",
  acbrMonitorPort: Number(process.env.V12_ACBR_MONITOR_PORT || 3434),
};
