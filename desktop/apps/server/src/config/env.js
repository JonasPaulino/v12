import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopEnvPath = path.resolve(__dirname, "../../../../.env");
const workspaceRoot = path.resolve(__dirname, "../../../../../");
const desktopRoot = path.resolve(workspaceRoot, "desktop");
const webAcbrRoot = path.resolve(workspaceRoot, "web", "acbr", "lib", "ACBrLibNFE");

dotenv.config({ path: desktopEnvPath });

const rootDir = process.cwd();
const defaultAcbrLibPath =
  process.platform === "win32"
    ? path.join(webAcbrRoot, "win64", "ACBrNFe64.dll")
    : path.join(webAcbrRoot, "linux", "CONSOLE-MT", "libacbrnfe64.so");

export const env = {
  port: Number(process.env.V12_LOCAL_PORT || 5100),
  dbPath: process.env.V12_LOCAL_DB_PATH || path.join(rootDir, "data", "v12-pdv.sqlite"),
  erpApiUrl: process.env.V12_ERP_API_URL || "",
  erpSyncToken: process.env.V12_ERP_SYNC_TOKEN || "",
  estacaoNome: process.env.V12_ESTACAO_NOME || "Caixa 01",
  acbrMode: process.env.V12_ACBR_MODE || "lib",
  acbrMonitorHost: process.env.V12_ACBR_MONITOR_HOST || "127.0.0.1",
  acbrMonitorPort: Number(process.env.V12_ACBR_MONITOR_PORT || 3434),
  acbrLibPath: process.env.V12_ACBRLIB_NFE_PATH || defaultAcbrLibPath,
  acbrLibSchemaPath:
    process.env.V12_ACBRLIB_SCHEMA_PATH ||
    path.join(webAcbrRoot, "dep", "Schemas", "NFe"),
  acbrLibIniServicosPath:
    process.env.V12_ACBRLIB_NFE_SERVICOS_PATH ||
    path.join(webAcbrRoot, "dep", "ACBrNFeServicos.ini"),
  acbrLibConfigDir:
    process.env.V12_ACBRLIB_CONFIG_DIR || path.join(desktopRoot, "data", "acbrlib", "config"),
  acbrLibTempDir:
    process.env.V12_ACBRLIB_TEMP_DIR || path.join(desktopRoot, "data", "acbrlib", "runtime"),
  acbrLibLogDir:
    process.env.V12_ACBRLIB_LOG_DIR || path.join(desktopRoot, "data", "acbrlib", "log"),
};
