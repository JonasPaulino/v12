import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const ACBrLibNFeMT = require("@projetoacbr/acbrlib-nfe-node/dist/src").default;

const DEFAULT_NFE_LIB_PATH = "./lib/ACBrLibNFE/linux/CONSOLE-MT/libacbrnfe64.so";
const DEFAULT_NFE_SCHEMA_PATH = "./lib/ACBrLibNFE/dep/Schemas";
const ACBR_DEBUG_CONFIG = process.env.ACBR_DEBUG_CONFIG === "true";
const DEFAULT_SSL_CONFIG = {
  sslCryptLib: "1",
  sslHttpLib: "3",
  sslXmlSignLib: "4",
  sslType: "5",
};

const resolveAppPath = (value, fallback) => path.resolve(process.cwd(), value || fallback);
const resolveAcbrConfigValue = (envName, fallback) => {
  const value = String(process.env[envName] || "").trim();
  return value || fallback;
};
const getAcbrSslConfig = () => ({
  sslCryptLib: resolveAcbrConfigValue("ACBR_DFE_SSL_CRYPT_LIB", DEFAULT_SSL_CONFIG.sslCryptLib),
  sslHttpLib: resolveAcbrConfigValue("ACBR_DFE_SSL_HTTP_LIB", DEFAULT_SSL_CONFIG.sslHttpLib),
  sslXmlSignLib: resolveAcbrConfigValue("ACBR_DFE_SSL_XML_SIGN_LIB", DEFAULT_SSL_CONFIG.sslXmlSignLib),
  sslType: resolveAcbrConfigValue("ACBR_NFE_SSL_TYPE", DEFAULT_SSL_CONFIG.sslType),
});
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

const escapeIniValue = (value) =>
  String(value ?? "")
    .replace(/\r?\n/g, " ")
    .trim();

const mapAcbrNfeAmbiente = (value) => (String(value || "2") === "1" ? "0" : "1");

const buildBaseNfeConfig = ({
  logDir,
  schemaDir,
  certPath = "",
  certificadoSenha = "",
  xmlDir = "",
  pdfDir = "",
  uf = "",
  ambiente = "2",
} = {}) => {
  const sslConfig = getAcbrSslConfig();
  const escapedLogDir = escapeIniValue(logDir);
  const escapedSchemaDir = escapeIniValue(schemaDir);
  const escapedCertPath = escapeIniValue(certPath);
  const escapedSenha = escapeIniValue(certificadoSenha);
  const escapedXmlDir = escapeIniValue(xmlDir);
  const escapedPdfDir = escapeIniValue(pdfDir);
  const escapedUf = escapeIniValue(uf).toUpperCase();
  const escapedAmbiente = mapAcbrNfeAmbiente(ambiente);

  return `[Principal]
TipoResposta=0
CodificacaoResposta=0
LogNivel=4
LogPath=${escapedLogDir}

[DFe]
SSLCryptLib=${sslConfig.sslCryptLib}
SSLHttpLib=${sslConfig.sslHttpLib}
SSLXmlSignLib=${sslConfig.sslXmlSignLib}
UF=${escapedUf}
ArquivoPFX=${escapedCertPath}
Senha=${escapedSenha}

[NFe]
Ambiente=${escapedAmbiente}
FormaEmissao=0
ModeloDF=0
VersaoDF=3
SSLType=${sslConfig.sslType}
PathSchemas=${escapedSchemaDir}
PathSalvar=${escapedXmlDir}
PathNFe=${escapedXmlDir}
SepararPorCNPJ=1

[DANFE]
PathPDF=${escapedPdfDir}

[Arquivos]
Salvar=1
PathSalvar=${escapedXmlDir}
PathSchemas=${escapedSchemaDir}

[Geral]
PathSchemas=${escapedSchemaDir}

[Certificado]
ArquivoPFX=${escapedCertPath}
Senha=${escapedSenha}
`;
};

const writeBaseNfeConfig = async (targetPath, options) => {
  await writeFile(targetPath, buildBaseNfeConfig(options));
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
  const nativeLibraries = {
    libxml2: existsSync("/usr/lib/libxml2.so"),
    libxmlsec1: existsSync("/usr/lib/libxmlsec1.so"),
    libxmlsec1OpenSsl: existsSync("/usr/lib/libxmlsec1-openssl.so"),
    libxslt: existsSync("/usr/lib/libxslt.so"),
    libssl: existsSync("/usr/lib/libssl.so"),
    libcrypto: existsSync("/usr/lib/libcrypto.so"),
  };

  return {
    enabled: String(process.env.ACBRLIB_ENABLED || "").toLowerCase() === "true",
    libPath,
    libExists: existsSync(libPath),
    schemaDir,
    schemaExists: existsSync(schemaDir),
    configDir,
    tempDir,
    sslConfig: getAcbrSslConfig(),
    openSslConf: process.env.OPENSSL_CONF || "",
    nativeLibraries,
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

  await writeBaseNfeConfig(configPath, {
    logDir,
    schemaDir: acbrRuntimePaths.schemaDir(),
    certPath,
    certificadoSenha,
    xmlDir,
    pdfDir,
  });

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
  const xmlDir = path.join(rootDir, "xml");
  const pdfDir = path.join(rootDir, "pdf");

  await ensureDir(rootDir);
  await ensureDir(logDir);
  await ensureDir(xmlDir);
  await ensureDir(pdfDir);

  if (certificadoBuffer?.length) {
    await writeFile(certPath, certificadoBuffer);
  }

  await writeBaseNfeConfig(configPath, {
    logDir,
    schemaDir: acbrRuntimePaths.schemaDir(),
    certPath,
    certificadoSenha,
    xmlDir,
    pdfDir,
  });

  const acbr = new ACBrLibNFeMT(acbrRuntimePaths.libPath(), configPath, "");

  return {
    acbr,
    configPath,
    certPath,
    rootDir,
    logDir,
    xmlDir,
    pdfDir,
    schemaDir: acbrRuntimePaths.schemaDir(),
    certificadoSenha: certificadoSenha || "",
  };
};

export const configureAcbrSession = async (session, context) => {
  const { acbr } = session;
  const sslConfig = getAcbrSslConfig();

  acbr.inicializar();

  setConfigValue(acbr, "Principal", "LogPath", session.logDir);
  setConfigValue(acbr, "Principal", "LogNivel", "4");
  setConfigValue(acbr, "DFe", "SSLCryptLib", sslConfig.sslCryptLib);
  setConfigValue(acbr, "DFe", "SSLHttpLib", sslConfig.sslHttpLib);
  setConfigValue(acbr, "DFe", "SSLXmlSignLib", sslConfig.sslXmlSignLib);
  setConfigValue(acbr, "DFe", "UF", context.emitente.uf);
  setConfigValue(acbr, "DFe", "ArquivoPFX", session.certPath);
  setConfigValue(acbr, "DFe", "Senha", session.certificadoSenha);
  setConfigValue(acbr, "Arquivos", "Salvar", "1", { optional: true });
  setConfigValue(acbr, "Arquivos", "PathSalvar", session.xmlDir, { optional: true });
  setConfigValue(acbr, "Arquivos", "PathSchemas", session.schemaDir, { optional: true });
  setConfigValue(acbr, "Geral", "PathSchemas", session.schemaDir, { optional: true });
  setConfigValue(acbr, "Certificado", "ArquivoPFX", session.certPath, { optional: true });
  setConfigValue(acbr, "Certificado", "Senha", session.certificadoSenha, { optional: true });
  setConfigValue(acbr, "NFe", "Ambiente", mapAcbrNfeAmbiente(context.nfe.ambiente_nfe));
  setConfigValue(acbr, "NFe", "FormaEmissao", "0", { optional: true });
  setConfigValue(acbr, "NFe", "ModeloDF", "0", { optional: true });
  setConfigValue(acbr, "NFe", "VersaoDF", "3", { optional: true });
  setConfigValue(acbr, "NFe", "SSLType", sslConfig.sslType, { optional: true });
  setConfigValue(acbr, "NFe", "PathSchemas", session.schemaDir);
  setConfigValue(acbr, "NFe", "PathSalvar", session.xmlDir, { optional: true });
  setConfigValue(acbr, "NFe", "PathNFe", session.xmlDir, { optional: true });
  setConfigValue(acbr, "DANFE", "PathPDF", session.pdfDir, { optional: true });
  acbr.configGravar();
};

export const configureAcbrLookupSession = async (session, { uf, ambiente = "2" }) => {
  const { acbr } = session;
  const sslConfig = getAcbrSslConfig();

  acbr.inicializar();
  setConfigValue(acbr, "Principal", "LogPath", session.logDir);
  setConfigValue(acbr, "Principal", "LogNivel", "4");
  setConfigValue(acbr, "DFe", "SSLCryptLib", sslConfig.sslCryptLib);
  setConfigValue(acbr, "DFe", "SSLHttpLib", sslConfig.sslHttpLib);
  setConfigValue(acbr, "DFe", "SSLXmlSignLib", sslConfig.sslXmlSignLib);
  setConfigValue(acbr, "DFe", "UF", String(uf || "").trim().toUpperCase());
  setConfigValue(acbr, "DFe", "ArquivoPFX", session.certPath);
  setConfigValue(acbr, "DFe", "Senha", session.certificadoSenha);
  setConfigValue(acbr, "Arquivos", "PathSchemas", session.schemaDir, { optional: true });
  setConfigValue(acbr, "Geral", "PathSchemas", session.schemaDir, { optional: true });
  setConfigValue(acbr, "Certificado", "ArquivoPFX", session.certPath, { optional: true });
  setConfigValue(acbr, "Certificado", "Senha", session.certificadoSenha, { optional: true });
  setConfigValue(acbr, "NFe", "Ambiente", mapAcbrNfeAmbiente(ambiente));
  setConfigValue(acbr, "NFe", "SSLType", sslConfig.sslType, { optional: true });
  setConfigValue(acbr, "NFe", "PathSchemas", session.schemaDir);
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
