import fs from "fs/promises";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const ACBrLibNFeMT = require("@projetoacbr/acbrlib-nfe-node/dist/src").default;

const resolveAppPath = (value, fallback) => path.resolve(process.cwd(), value || fallback);
const resolveLibPath = () => {
  const configuredPath = String(process.env.ACBRLIB_PATH || "").trim();
  if (!configuredPath) return "";
  return path.resolve(process.cwd(), configuredPath);
};

const baseConfigDir = () => resolveAppPath(process.env.ACBRLIB_CONFIG_DIR, "./config/acbrlib");
const baseTempDir = () => resolveAppPath(process.env.ACBRLIB_TEMP_DIR, "./temp");
const baseSchemaDir = () => resolveAppPath(process.env.ACBRLIB_SCHEMA_PATH, "./resources/schemas");

const ensureDir = async (targetPath) => {
  await fs.mkdir(targetPath, { recursive: true });
};

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

  if (!libPath) {
    throw new Error("ACBRLIB_PATH não configurado.");
  }

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
