import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const ACBrLibNFeMT = require("@projetoacbr/acbrlib-nfe-node/dist/src").default;

const DEFAULT_NFE_LIB_PATH = "./lib/ACBrLibNFE/linux/mt/libacbrnfe64.so";
const DEFAULT_NFE_SCHEMA_PATH = "./lib/ACBrLibNFE/dep/Schemas";
const ACBR_DEBUG_CONFIG = process.env.ACBR_DEBUG_CONFIG === "true";

const resolveAppPath = (value, fallback) => path.resolve(process.cwd(), value || fallback);
const resolveLibPath = () => {
  const configuredPath = String(process.env.ACBRLIB_PATH || "").trim();
  const resolvedConfiguredPath = configuredPath
    ? path.resolve(process.cwd(), configuredPath)
    : "";
  const fallbackPath = path.resolve(process.cwd(), DEFAULT_NFE_LIB_PATH);

  if (resolvedConfiguredPath && existsSync(resolvedConfiguredPath)) {
    return resolvedConfiguredPath;
  }

  return fallbackPath;
};

const baseConfigDir = () => resolveAppPath(process.env.ACBRLIB_CONFIG_DIR, "./config/acbrlib");
const baseTempDir = () => resolveAppPath(process.env.ACBRLIB_TEMP_DIR, "./temp");
const baseSchemaDir = () => {
  const configuredPath = String(process.env.ACBRLIB_SCHEMA_PATH || "").trim();
  const resolvedConfiguredPath = configuredPath
    ? path.resolve(process.cwd(), configuredPath)
    : "";
  const fallbackPath = path.resolve(process.cwd(), DEFAULT_NFE_SCHEMA_PATH);

  if (resolvedConfiguredPath && existsSync(resolvedConfiguredPath)) {
    return resolvedConfiguredPath;
  }

  return fallbackPath;
};

const ensureDir = async (targetPath) => {
  await fs.mkdir(targetPath, { recursive: true });
};

const sanitizeScope = (value) =>
  String(value || "default")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "default";

const writeFile = async (targetPath, content) => {
  await ensureDir(path.dirname(targetPath));
  await fs.writeFile(targetPath, content);
};

const isMissingConfigEntryError = (error) =>
  /Chave .* não existe na Sessão|Chave .* nao existe na Sessao|Sessão .* não existe|Sessao .* nao existe/i.test(
    String(error?.message || "")
  );

const setConfigValue = (acbr, sessao, chave, valor, { optional = false } = {}) => {
  try {
    acbr.configGravarValor(sessao, chave, valor);
  } catch (error) {
    if (ACBR_DEBUG_CONFIG) {
      console.error("[acbr:config] Falha ao gravar configuração", {
        sessao,
        chave,
        optional,
        message: String(error?.message || error),
      });
    }

    if (optional && isMissingConfigEntryError(error)) {
      return;
    }

    throw error;
  }
};

const setConfigValueInSessions = (acbr, sessoes, chave, valor, { optional = false } = {}) => {
  let lastError = null;

  for (const sessao of sessoes) {
    try {
      acbr.configGravarValor(sessao, chave, valor);
      return;
    } catch (error) {
      lastError = error;

      if (ACBR_DEBUG_CONFIG) {
        console.error("[acbr:config] Falha ao gravar configuração", {
          sessao,
          chave,
          optional,
          message: String(error?.message || error),
        });
      }

      if (!isMissingConfigEntryError(error)) {
        throw error;
      }
    }
  }

  if (!optional && lastError) {
    throw lastError;
  }
};

export const acbrRuntimePaths = {
  libPath: resolveLibPath,
  configDir: baseConfigDir,
  tempDir: baseTempDir,
  schemaDir: baseSchemaDir,
};

export const getAcbrRuntimeDiagnostics = () => {
  const libPath = acbrRuntimePaths.libPath();
  const schemaDir = acbrRuntimePaths.schemaDir();
  const configDir = acbrRuntimePaths.configDir();
  const tempDir = acbrRuntimePaths.tempDir();

  return {
    enabled: String(process.env.ACBRLIB_ENABLED || "").toLowerCase() === "true",
    libPath,
    libExists: existsSync(libPath),
    schemaDir,
    schemaExists: existsSync(schemaDir),
    configDir,
    tempDir,
  };
};

export const ensureAcbrRuntimePrerequisites = async () => {
  const libPath = acbrRuntimePaths.libPath();

  await fs.access(libPath);
  await fs.access(acbrRuntimePaths.schemaDir());

  await ensureDir(acbrRuntimePaths.configDir());
  await ensureDir(acbrRuntimePaths.tempDir());
};

export const createAcbrSession = async ({ tenantId, nfeId, certificadoBuffer, certificadoSenha }) => {
  await ensureAcbrRuntimePrerequisites();

  const rootDir = path.join(acbrRuntimePaths.tempDir(), `tenant-${tenantId}`, `nfe-${nfeId}`);
  const configPath = path.join(acbrRuntimePaths.configDir(), `tenant-${tenantId}-nfe-${nfeId}.ini`);
  const certPath = path.join(rootDir, "certificado-a1.pfx");
  const iniPath = path.join(rootDir, "nfe.ini");
  const xmlDir = path.join(rootDir, "xml");
  const pdfDir = path.join(rootDir, "pdf");
  const logDir = path.join(rootDir, "log");

  await ensureDir(rootDir);
  await ensureDir(xmlDir);
  await ensureDir(pdfDir);
  await ensureDir(logDir);

  if (certificadoBuffer?.length) {
    await writeFile(certPath, certificadoBuffer);
  }

  const acbr = new ACBrLibNFeMT(acbrRuntimePaths.libPath(), configPath, "");

  return {
    acbr,
    configPath,
    certPath,
    iniPath,
    rootDir,
    xmlDir,
    pdfDir,
    logDir,
    schemaDir: acbrRuntimePaths.schemaDir(),
    certificadoSenha: certificadoSenha || "",
  };
};

export const createAcbrLookupSession = async ({
  scopeKey,
  certificadoBuffer,
  certificadoSenha,
}) => {
  await ensureAcbrRuntimePrerequisites();

  const safeScope = sanitizeScope(scopeKey);
  const rootDir = path.join(acbrRuntimePaths.tempDir(), "lookup", safeScope);
  const configPath = path.join(acbrRuntimePaths.configDir(), `lookup-${safeScope}.ini`);
  const certPath = path.join(rootDir, "certificado-a1.pfx");
  const logDir = path.join(rootDir, "log");

  await ensureDir(rootDir);
  await ensureDir(logDir);

  if (certificadoBuffer?.length) {
    await writeFile(certPath, certificadoBuffer);
  }

  const acbr = new ACBrLibNFeMT(acbrRuntimePaths.libPath(), configPath, "");

  return {
    acbr,
    configPath,
    certPath,
    rootDir,
    logDir,
    schemaDir: acbrRuntimePaths.schemaDir(),
    certificadoSenha: certificadoSenha || "",
  };
};

export const configureAcbrSession = async (session, context) => {
  const { acbr } = session;

  acbr.inicializar();

  setConfigValue(acbr, "Principal", "LogPath", session.logDir);
  setConfigValue(acbr, "Principal", "LogNivel", "4");
  setConfigValue(acbr, "DFe", "SSLLib", "libOpenSSL", { optional: true });
  setConfigValue(acbr, "DFe", "SSLCryptLib", "cryOpenSSL", { optional: true });
  setConfigValue(acbr, "DFe", "SSLHttpLib", "httpOpenSSL", { optional: true });
  setConfigValue(acbr, "DFe", "SSLXmlSignLib", "xsLibXml2", { optional: true });
  setConfigValue(acbr, "DFe", "FormaEmissao", "teNormal", { optional: true });
  setConfigValue(acbr, "Arquivos", "Salvar", "1", { optional: true });
  setConfigValue(acbr, "Arquivos", "PathSalvar", session.xmlDir, { optional: true });
  setConfigValue(acbr, "Arquivos", "PathSchemas", session.schemaDir, { optional: true });
  setConfigValue(acbr, "Geral", "PathSchemas", session.schemaDir, { optional: true });
  setConfigValue(acbr, "Certificado", "ArquivoPFX", session.certPath, { optional: true });
  setConfigValue(acbr, "Certificado", "Senha", session.certificadoSenha, { optional: true });
  setConfigValue(acbr, "DFe", "ArquivoPFX", session.certPath, { optional: true });
  setConfigValue(acbr, "DFe", "Senha", session.certificadoSenha, { optional: true });
  setConfigValue(acbr, "NFe", "ArquivoPFX", session.certPath, { optional: true });
  setConfigValue(acbr, "NFe", "Senha", session.certificadoSenha, { optional: true });
  setConfigValueInSessions(acbr, ["WebService", "WebServices"], "UF", context.emitente.uf);
  setConfigValueInSessions(
    acbr,
    ["WebService", "WebServices"],
    "Ambiente",
    context.nfe.ambiente_nfe
  );
  acbr.configGravar();
};

export const configureAcbrLookupSession = async (session, { uf, ambiente = "2" }) => {
  const { acbr } = session;

  acbr.inicializar();
  setConfigValue(acbr, "Principal", "LogPath", session.logDir);
  setConfigValue(acbr, "Principal", "LogNivel", "4");
  setConfigValue(acbr, "DFe", "SSLLib", "libOpenSSL", { optional: true });
  setConfigValue(acbr, "DFe", "SSLCryptLib", "cryOpenSSL", { optional: true });
  setConfigValue(acbr, "DFe", "SSLHttpLib", "httpOpenSSL", { optional: true });
  setConfigValue(acbr, "DFe", "SSLXmlSignLib", "xsLibXml2", { optional: true });
  setConfigValue(acbr, "Arquivos", "PathSchemas", session.schemaDir, { optional: true });
  setConfigValue(acbr, "Geral", "PathSchemas", session.schemaDir, { optional: true });
  setConfigValue(acbr, "Certificado", "ArquivoPFX", session.certPath, { optional: true });
  setConfigValue(acbr, "Certificado", "Senha", session.certificadoSenha, { optional: true });
  setConfigValue(acbr, "DFe", "ArquivoPFX", session.certPath, { optional: true });
  setConfigValue(acbr, "DFe", "Senha", session.certificadoSenha, { optional: true });
  setConfigValue(acbr, "NFe", "ArquivoPFX", session.certPath, { optional: true });
  setConfigValue(acbr, "NFe", "Senha", session.certificadoSenha, { optional: true });
  setConfigValueInSessions(
    acbr,
    ["WebService", "WebServices"],
    "UF",
    String(uf || "").trim().toUpperCase(),
    { optional: true }
  );
  setConfigValueInSessions(
    acbr,
    ["WebService", "WebServices"],
    "Ambiente",
    String(ambiente || "2"),
    { optional: true }
  );
  acbr.configGravar();
};

export const destroyAcbrSession = async (session) => {
  if (!session?.acbr) return;

  try {
    session.acbr.finalizar();
  } catch {}
};

export const writeAcbrIni = async (session, iniContent) => {
  await writeFile(session.iniPath, iniContent);
  return session.iniPath;
};
