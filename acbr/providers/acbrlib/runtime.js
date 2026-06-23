import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const ACBrLibNFeMT = require("@projetoacbr/acbrlib-nfe-node/dist/src").default;

const DEFAULT_NFE_LIB_PATH = "./lib/ACBrLibNFE/linux/mt/libacbrnfe64.so";
const DEFAULT_NFE_SCHEMA_PATH = "./lib/ACBrLibNFE/dep/Schemas";

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

export const acbrRuntimePaths = {
  libPath: resolveLibPath,
  configDir: baseConfigDir,
  tempDir: baseTempDir,
  schemaDir: baseSchemaDir,
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

  acbr.configGravarValor("Principal", "LogPath", session.logDir);
  acbr.configGravarValor("Principal", "LogNivel", "4");
  acbr.configGravarValor("DFe", "SSLLib", "libOpenSSL");
  acbr.configGravarValor("DFe", "SSLCryptLib", "cryOpenSSL");
  acbr.configGravarValor("DFe", "SSLHttpLib", "httpOpenSSL");
  acbr.configGravarValor("DFe", "SSLXmlSignLib", "xsLibXml2");
  acbr.configGravarValor("DFe", "FormaEmissao", "teNormal");
  acbr.configGravarValor("Arquivos", "Salvar", "1");
  acbr.configGravarValor("Arquivos", "PathSalvar", session.xmlDir);
  acbr.configGravarValor("Arquivos", "PathSchemas", session.schemaDir);
  acbr.configGravarValor("Certificado", "ArquivoPFX", session.certPath);
  acbr.configGravarValor("Certificado", "Senha", session.certificadoSenha);
  acbr.configGravarValor("WebService", "UF", context.emitente.uf);
  acbr.configGravarValor("WebService", "Ambiente", context.nfe.ambiente_nfe);
  acbr.configGravar();
};

export const configureAcbrLookupSession = async (session, { uf, ambiente = "2" }) => {
  const { acbr } = session;

  acbr.inicializar();
  acbr.configGravarValor("Principal", "LogPath", session.logDir);
  acbr.configGravarValor("Principal", "LogNivel", "4");
  acbr.configGravarValor("DFe", "SSLLib", "libOpenSSL");
  acbr.configGravarValor("DFe", "SSLCryptLib", "cryOpenSSL");
  acbr.configGravarValor("DFe", "SSLHttpLib", "httpOpenSSL");
  acbr.configGravarValor("DFe", "SSLXmlSignLib", "xsLibXml2");
  acbr.configGravarValor("Arquivos", "PathSchemas", session.schemaDir);
  acbr.configGravarValor("Certificado", "ArquivoPFX", session.certPath);
  acbr.configGravarValor("Certificado", "Senha", session.certificadoSenha);
  acbr.configGravarValor("WebService", "UF", String(uf || "").trim().toUpperCase());
  acbr.configGravarValor("WebService", "Ambiente", String(ambiente || "2"));
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
