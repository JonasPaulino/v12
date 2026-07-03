import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import AcbrLibMDFeMT from "./mdfeNative.js";

const DEFAULT_MDFE_LIB_PATH = "./lib/ACBrLibMDFe/Linux/CONSOLE-MT/libacbrmdfe64.so";
const DEFAULT_MDFE_SCHEMA_PATH = "./lib/ACBrLibMDFe/dep/Schemas/MDFe";
const DEFAULT_MDFE_SERVICOS_PATH = "./lib/ACBrLibMDFe/dep/ACBrMDFeServicos.ini";
const DEFAULT_SSL_CONFIG = {
  sslCryptLib: "1",
  sslHttpLib: "3",
  sslXmlSignLib: "4",
  sslType: "5",
};

const resolveAppPath = (value, fallback) => path.resolve(process.cwd(), value || fallback);
const resolveConfigValue = (envName, fallback) => String(process.env[envName] || "").trim() || fallback;
const escapeIniValue = (value) => String(value ?? "").replace(/\r?\n/g, " ").trim();
const mapAmbiente = (value) => (String(value || "2") === "1" ? "0" : "1");

const mdfeSslConfig = () => ({
  sslCryptLib: resolveConfigValue("ACBR_DFE_SSL_CRYPT_LIB", DEFAULT_SSL_CONFIG.sslCryptLib),
  sslHttpLib: resolveConfigValue("ACBR_DFE_SSL_HTTP_LIB", DEFAULT_SSL_CONFIG.sslHttpLib),
  sslXmlSignLib: resolveConfigValue("ACBR_DFE_SSL_XML_SIGN_LIB", DEFAULT_SSL_CONFIG.sslXmlSignLib),
  sslType: resolveConfigValue("ACBR_MDFE_SSL_TYPE", DEFAULT_SSL_CONFIG.sslType),
});

const resolveMdfeLibPath = () => {
  const configuredPath = String(process.env.ACBRLIB_MDFE_PATH || "").trim();
  const fallbackPath = path.resolve(process.cwd(), DEFAULT_MDFE_LIB_PATH);
  const resolvedConfiguredPath = configuredPath ? path.resolve(process.cwd(), configuredPath) : "";

  if (resolvedConfiguredPath && existsSync(resolvedConfiguredPath)) return resolvedConfiguredPath;
  return fallbackPath;
};

const resolveMdfeSchemaDir = () => {
  const configuredPath = String(process.env.ACBRLIB_MDFE_SCHEMA_PATH || "").trim();
  const fallbackPath = path.resolve(process.cwd(), DEFAULT_MDFE_SCHEMA_PATH);
  const resolvedConfiguredPath = configuredPath ? path.resolve(process.cwd(), configuredPath) : "";

  if (resolvedConfiguredPath && existsSync(resolvedConfiguredPath)) {
    const mdfeSubdir = path.join(resolvedConfiguredPath, "MDFe");
    if (existsSync(mdfeSubdir)) return mdfeSubdir;
    return resolvedConfiguredPath;
  }

  return fallbackPath;
};

const resolveMdfeServicosPath = () => {
  const configuredPath = String(process.env.ACBRLIB_MDFE_SERVICOS_PATH || "").trim();
  const fallbackPath = path.resolve(process.cwd(), DEFAULT_MDFE_SERVICOS_PATH);
  const resolvedConfiguredPath = configuredPath ? path.resolve(process.cwd(), configuredPath) : "";

  if (resolvedConfiguredPath && existsSync(resolvedConfiguredPath)) return resolvedConfiguredPath;
  return fallbackPath;
};

const ensureDir = async (targetPath) => {
  await fs.mkdir(targetPath, { recursive: true });
};

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
    if (optional && isMissingConfigEntryError(error)) return;
    throw error;
  }
};

const buildBaseMdfeConfig = ({
  logDir,
  schemaDir,
  servicosPath,
  certPath = "",
  certificadoSenha = "",
  xmlDir = "",
  pdfDir = "",
  uf = "",
  ambiente = "2",
} = {}) => {
  const ssl = mdfeSslConfig();

  return `[Principal]
TipoResposta=0
CodificacaoResposta=0
LogNivel=4
LogPath=${escapeIniValue(logDir)}

[DFe]
SSLCryptLib=${ssl.sslCryptLib}
SSLHttpLib=${ssl.sslHttpLib}
SSLXmlSignLib=${ssl.sslXmlSignLib}
UF=${escapeIniValue(uf).toUpperCase()}
ArquivoPFX=${escapeIniValue(certPath)}
Senha=${escapeIniValue(certificadoSenha)}

[MDFe]
Ambiente=${mapAmbiente(ambiente)}
FormaEmissao=0
VersaoDF=3
SSLType=${ssl.sslType}
PathSchemas=${escapeIniValue(schemaDir)}
IniServicos=${escapeIniValue(servicosPath)}
PathSalvar=${escapeIniValue(xmlDir)}
PathMDFe=${escapeIniValue(xmlDir)}
SepararPorCNPJ=1

[DAMDFE]
PathPDF=${escapeIniValue(pdfDir)}

[Arquivos]
Salvar=1
PathSalvar=${escapeIniValue(xmlDir)}
PathSchemas=${escapeIniValue(schemaDir)}

[Geral]
PathSchemas=${escapeIniValue(schemaDir)}
IniServicos=${escapeIniValue(servicosPath)}

[Certificado]
ArquivoPFX=${escapeIniValue(certPath)}
Senha=${escapeIniValue(certificadoSenha)}
`;
};

export const mdfeRuntimePaths = {
  libPath: resolveMdfeLibPath,
  configDir: () => resolveAppPath(process.env.ACBRLIB_MDFE_CONFIG_DIR, "./config/acbrlib-mdfe"),
  tempDir: () => resolveAppPath(process.env.ACBRLIB_MDFE_TEMP_DIR, "./temp-mdfe"),
  schemaDir: resolveMdfeSchemaDir,
  servicosPath: resolveMdfeServicosPath,
};

export const getMdfeRuntimeDiagnostics = () => {
  const libPath = mdfeRuntimePaths.libPath();
  const schemaDir = mdfeRuntimePaths.schemaDir();
  const servicosPath = mdfeRuntimePaths.servicosPath();

  return {
    enabled: String(process.env.ACBRLIB_ENABLED || "").toLowerCase() === "true",
    libPath,
    libExists: existsSync(libPath),
    schemaDir,
    schemaExists: existsSync(schemaDir),
    servicosPath,
    servicosExists: existsSync(servicosPath),
    configDir: mdfeRuntimePaths.configDir(),
    tempDir: mdfeRuntimePaths.tempDir(),
    sslConfig: mdfeSslConfig(),
  };
};

export const ensureMdfeRuntimePrerequisites = async () => {
  await fs.access(mdfeRuntimePaths.libPath());
  await fs.access(mdfeRuntimePaths.schemaDir());
  await fs.access(mdfeRuntimePaths.servicosPath());
  await ensureDir(mdfeRuntimePaths.configDir());
  await ensureDir(mdfeRuntimePaths.tempDir());
};

export const createMdfeStatusSession = async ({
  tenantId,
  certificadoBuffer,
  certificadoSenha,
  uf,
  ambiente = "2",
}) => {
  await ensureMdfeRuntimePrerequisites();

  const rootDir = path.join(mdfeRuntimePaths.tempDir(), `tenant-${tenantId}`, "status");
  const configPath = path.join(mdfeRuntimePaths.configDir(), `tenant-${tenantId}-status.ini`);
  const certPath = path.join(rootDir, "certificado-a1.pfx");
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

  await writeFile(
    configPath,
    buildBaseMdfeConfig({
      logDir,
      schemaDir: mdfeRuntimePaths.schemaDir(),
      servicosPath: mdfeRuntimePaths.servicosPath(),
      certPath,
      certificadoSenha,
      xmlDir,
      pdfDir,
      uf,
      ambiente,
    })
  );

  const acbr = new AcbrLibMDFeMT(mdfeRuntimePaths.libPath(), configPath, "");

  return {
    acbr,
    configPath,
    certPath,
    rootDir,
    xmlDir,
    pdfDir,
    logDir,
    schemaDir: mdfeRuntimePaths.schemaDir(),
    servicosPath: mdfeRuntimePaths.servicosPath(),
    certificadoSenha: certificadoSenha || "",
    uf,
    ambiente,
  };
};

export const createMdfeEmissionSession = async ({
  tenantId,
  mdfeId,
  certificadoBuffer,
  certificadoSenha,
}) => {
  await ensureMdfeRuntimePrerequisites();

  const rootDir = path.join(mdfeRuntimePaths.tempDir(), `tenant-${tenantId}`, `mdfe-${mdfeId}`);
  const configPath = path.join(mdfeRuntimePaths.configDir(), `tenant-${tenantId}-mdfe-${mdfeId}.ini`);
  const certPath = path.join(rootDir, "certificado-a1.pfx");
  const iniPath = path.join(rootDir, "mdfe.ini");
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

  await writeFile(
    configPath,
    buildBaseMdfeConfig({
      logDir,
      schemaDir: mdfeRuntimePaths.schemaDir(),
      servicosPath: mdfeRuntimePaths.servicosPath(),
      certPath,
      certificadoSenha,
      xmlDir,
      pdfDir,
    })
  );

  const acbr = new AcbrLibMDFeMT(mdfeRuntimePaths.libPath(), configPath, "");

  return {
    acbr,
    configPath,
    certPath,
    iniPath,
    rootDir,
    xmlDir,
    pdfDir,
    logDir,
    schemaDir: mdfeRuntimePaths.schemaDir(),
    servicosPath: mdfeRuntimePaths.servicosPath(),
    certificadoSenha: certificadoSenha || "",
  };
};

export const configureMdfeStatusSession = async (session) => {
  const { acbr } = session;
  const ssl = mdfeSslConfig();

  acbr.inicializar();
  acbr.configGravarValor("Principal", "LogPath", session.logDir);
  acbr.configGravarValor("Principal", "LogNivel", "4");
  acbr.configGravarValor("DFe", "SSLCryptLib", ssl.sslCryptLib);
  acbr.configGravarValor("DFe", "SSLHttpLib", ssl.sslHttpLib);
  acbr.configGravarValor("DFe", "SSLXmlSignLib", ssl.sslXmlSignLib);
  acbr.configGravarValor("DFe", "UF", String(session.uf || "").toUpperCase());
  acbr.configGravarValor("DFe", "ArquivoPFX", session.certPath);
  acbr.configGravarValor("DFe", "Senha", session.certificadoSenha);
  setConfigValue(acbr, "DFe", "IniServicos", session.servicosPath, { optional: true });
  acbr.configGravarValor("MDFe", "Ambiente", mapAmbiente(session.ambiente));
  acbr.configGravarValor("MDFe", "SSLType", ssl.sslType);
  acbr.configGravarValor("MDFe", "PathSchemas", session.schemaDir);
  setConfigValue(acbr, "MDFe", "IniServicos", session.servicosPath, { optional: true });
  acbr.configGravarValor("MDFe", "PathSalvar", session.xmlDir);
  acbr.configGravarValor("Arquivos", "Salvar", "1");
  acbr.configGravarValor("Arquivos", "PathSalvar", session.xmlDir);
  acbr.configGravarValor("Arquivos", "PathSchemas", session.schemaDir);
  acbr.configGravar();
};

export const configureMdfeEmissionSession = async (session, context) => {
  const { acbr } = session;
  const ssl = mdfeSslConfig();

  acbr.inicializar();
  setConfigValue(acbr, "Principal", "LogPath", session.logDir);
  setConfigValue(acbr, "Principal", "LogNivel", "4");
  setConfigValue(acbr, "DFe", "SSLCryptLib", ssl.sslCryptLib);
  setConfigValue(acbr, "DFe", "SSLHttpLib", ssl.sslHttpLib);
  setConfigValue(acbr, "DFe", "SSLXmlSignLib", ssl.sslXmlSignLib);
  setConfigValue(acbr, "DFe", "UF", String(context.emitente.uf || context.mdfe.uf_inicio || "").toUpperCase());
  setConfigValue(acbr, "DFe", "ArquivoPFX", session.certPath);
  setConfigValue(acbr, "DFe", "Senha", session.certificadoSenha);
  setConfigValue(acbr, "DFe", "IniServicos", session.servicosPath, { optional: true });
  setConfigValue(acbr, "Arquivos", "Salvar", "1", { optional: true });
  setConfigValue(acbr, "Arquivos", "PathSalvar", session.xmlDir, { optional: true });
  setConfigValue(acbr, "Arquivos", "PathSchemas", session.schemaDir, { optional: true });
  setConfigValue(acbr, "Geral", "PathSchemas", session.schemaDir, { optional: true });
  setConfigValue(acbr, "Geral", "IniServicos", session.servicosPath, { optional: true });
  setConfigValue(acbr, "Certificado", "ArquivoPFX", session.certPath, { optional: true });
  setConfigValue(acbr, "Certificado", "Senha", session.certificadoSenha, { optional: true });
  setConfigValue(acbr, "MDFe", "Ambiente", mapAmbiente(context.mdfe.ambiente));
  setConfigValue(acbr, "MDFe", "FormaEmissao", "0", { optional: true });
  setConfigValue(acbr, "MDFe", "VersaoDF", "3", { optional: true });
  setConfigValue(acbr, "MDFe", "SSLType", ssl.sslType, { optional: true });
  setConfigValue(acbr, "MDFe", "PathSchemas", session.schemaDir);
  setConfigValue(acbr, "MDFe", "IniServicos", session.servicosPath, { optional: true });
  setConfigValue(acbr, "MDFe", "PathSalvar", session.xmlDir, { optional: true });
  setConfigValue(acbr, "MDFe", "PathMDFe", session.xmlDir, { optional: true });
  setConfigValue(acbr, "DAMDFE", "PathPDF", session.pdfDir, { optional: true });
  acbr.configGravar();
};

export const destroyMdfeSession = async (session) => {
  if (!session?.acbr) return;

  try {
    session.acbr.finalizar();
  } catch {}
};

export const writeMdfeIni = async (session, iniContent) => {
  await writeFile(session.iniPath, iniContent);
  return session.iniPath;
};
