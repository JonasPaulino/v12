import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { env } from "../../config/env.js";
import { getPrinterConfig } from "../printerConfigService.js";

const require = createRequire(import.meta.url);
const ACBrLibNFeMT = require("@projetoacbr/acbrlib-nfe-node/dist/src").default;

const DEFAULT_SSL_CONFIG = {
  sslCryptLib: "1",
  sslHttpLib: "3",
  sslXmlSignLib: "4",
  sslType: "5",
};

const ensureDir = async (targetPath) => {
  await fs.mkdir(targetPath, { recursive: true });
};

const mapAcbrAmbiente = (value) => (String(value || "2") === "1" ? "0" : "1");

const resolveSslConfig = () => ({
  sslCryptLib: String(process.env.V12_ACBR_DFE_SSL_CRYPT_LIB || DEFAULT_SSL_CONFIG.sslCryptLib),
  sslHttpLib: String(process.env.V12_ACBR_DFE_SSL_HTTP_LIB || DEFAULT_SSL_CONFIG.sslHttpLib),
  sslXmlSignLib: String(process.env.V12_ACBR_DFE_SSL_XML_SIGN_LIB || DEFAULT_SSL_CONFIG.sslXmlSignLib),
  sslType: String(process.env.V12_ACBR_NFE_SSL_TYPE || DEFAULT_SSL_CONFIG.sslType),
});

export function getAcbrLibDiagnostics() {
  return {
    mode: env.acbrMode,
    libPath: env.acbrLibPath,
    libExists: existsSync(env.acbrLibPath),
    schemaPath: env.acbrLibSchemaPath,
    schemaExists: existsSync(env.acbrLibSchemaPath),
    iniServicosPath: env.acbrLibIniServicosPath,
    iniServicosExists: existsSync(env.acbrLibIniServicosPath),
    configDir: env.acbrLibConfigDir,
    tempDir: env.acbrLibTempDir,
    logDir: env.acbrLibLogDir,
  };
}

export async function ensureAcbrLibRuntime() {
  if (!existsSync(env.acbrLibPath)) {
    throw new Error(`ACBrLibNFe não encontrada em ${env.acbrLibPath}.`);
  }

  if (!existsSync(env.acbrLibSchemaPath)) {
    throw new Error(`Schemas da NFC-e não encontrados em ${env.acbrLibSchemaPath}.`);
  }

  if (!existsSync(env.acbrLibIniServicosPath)) {
    throw new Error(`Arquivo ACBrNFeServicos.ini não encontrado em ${env.acbrLibIniServicosPath}.`);
  }

  await ensureDir(env.acbrLibConfigDir);
  await ensureDir(env.acbrLibTempDir);
  await ensureDir(env.acbrLibLogDir);
}

function applyConfig(acbr, sessao, chave, valor) {
  if (value === undefined || value === null || value === "") return;
  try {
    acbr.configGravarValor(sessao, chave, String(value));
  } catch (error) {
    const message = String(error?.message || error);
    if (/Chave .* não existe na Sessão|Chave .* nao existe na Sessao|Sessão .* não existe|Sessao .* nao existe/i.test(message)) {
      return;
    }
    throw error;
  }
}

function configurePrinter(acbr, pdfDir, printerConfig = getPrinterConfig()) {
  applyConfig(acbr, "DANFE", "TipoDANFE", "4");
  applyConfig(acbr, "DANFE", "PathPDF", pdfDir);

  const isA4 = printerConfig.layout === "a4";
  applyConfig(acbr, "DANFENFCe", "TipoRelatorioBobina", isA4 ? "2" : "1");
  applyConfig(acbr, "DANFENFCe", "LarguraBobina", String(printerConfig.paperWidth || 80));
  applyConfig(acbr, "DANFENFCe", "ImprimeItens", "1");
  applyConfig(acbr, "DANFENFCe", "ViaConsumidor", "1");
  applyConfig(acbr, "DANFENFCe", "ImprimeDescAcrescItem", "1");
  applyConfig(acbr, "DANFENFCe", "MargemInferior", "4");
  applyConfig(acbr, "DANFENFCe", "MargemSuperior", "4");
  applyConfig(acbr, "DANFENFCe", "MargemEsquerda", "4");
  applyConfig(acbr, "DANFENFCe", "MargemDireita", "4");

  if (printerConfig.enabled && printerConfig.deviceName) {
    applyConfig(acbr, "PosPrinter", "Modelo", "0");
    applyConfig(acbr, "PosPrinter", "Porta", `RAW:${printerConfig.deviceName}`);
  }
}

export async function createAcbrSession({
  tenantId,
  vendaId,
  certificadoBuffer,
  certificadoSenha,
  ambiente,
  emitenteUf,
}) {
  await ensureAcbrLibRuntime();

  const rootDir = path.join(env.acbrLibTempDir, `tenant-${tenantId}`, `venda-${vendaId}`);
  const configPath = path.join(env.acbrLibConfigDir, `tenant-${tenantId}-venda-${vendaId}.ini`);
  const certPath = path.join(rootDir, "certificado-a1.pfx");
  const iniPath = path.join(rootDir, "nfce.ini");
  const xmlDir = path.join(rootDir, "xml");
  const pdfDir = path.join(rootDir, "pdf");
  const logDir = path.join(env.acbrLibLogDir, `tenant-${tenantId}`);

  await ensureDir(rootDir);
  await ensureDir(xmlDir);
  await ensureDir(pdfDir);
  await ensureDir(logDir);
  await fs.writeFile(certPath, certificadoBuffer);

  const acbr = new ACBrLibNFeMT(env.acbrLibPath, configPath, "");
  acbr.inicializar();

  const sslConfig = resolveSslConfig();

  applyConfig(acbr, "Principal", "LogNivel", "4");
  applyConfig(acbr, "Principal", "LogPath", logDir);

  applyConfig(acbr, "DFe", "SSLCryptLib", sslConfig.sslCryptLib);
  applyConfig(acbr, "DFe", "SSLHttpLib", sslConfig.sslHttpLib);
  applyConfig(acbr, "DFe", "SSLXmlSignLib", sslConfig.sslXmlSignLib);
  applyConfig(acbr, "DFe", "SSLType", sslConfig.sslType);
  applyConfig(acbr, "DFe", "UF", String(emitenteUf || "").toUpperCase());
  applyConfig(acbr, "DFe", "ArquivoPFX", certPath);
  applyConfig(acbr, "DFe", "Senha", certificadoSenha || "");

  applyConfig(acbr, "NFE", "Ambiente", mapAcbrAmbiente(ambiente));
  applyConfig(acbr, "NFE", "FormaEmissao", "0");
  applyConfig(acbr, "NFE", "ModeloDF", "1");
  applyConfig(acbr, "NFE", "VersaoDF", "3");
  applyConfig(acbr, "NFE", "SSLType", sslConfig.sslType);
  applyConfig(acbr, "NFE", "PathSchemas", env.acbrLibSchemaPath);
  applyConfig(acbr, "NFE", "PathSalvar", xmlDir);
  applyConfig(acbr, "NFE", "PathNFe", xmlDir);
  applyConfig(acbr, "NFE", "IniServicos", env.acbrLibIniServicosPath);

  applyConfig(acbr, "Arquivos", "Salvar", "1");
  applyConfig(acbr, "Arquivos", "PathSalvar", xmlDir);
  applyConfig(acbr, "Arquivos", "PathSchemas", env.acbrLibSchemaPath);
  applyConfig(acbr, "Geral", "PathSchemas", env.acbrLibSchemaPath);
  applyConfig(acbr, "Geral", "IniServicos", env.acbrLibIniServicosPath);
  applyConfig(acbr, "Certificado", "ArquivoPFX", certPath);
  applyConfig(acbr, "Certificado", "Senha", certificadoSenha || "");

  configurePrinter(acbr, pdfDir);
  acbr.configGravar(configPath);

  return {
    acbr,
    tenantId,
    vendaId,
    rootDir,
    configPath,
    certPath,
    iniPath,
    xmlDir,
    pdfDir,
    logDir,
  };
}

export async function writeAcbrIni(session, iniContent) {
  await fs.writeFile(session.iniPath, iniContent, "utf8");
  return session.iniPath;
}

export async function destroyAcbrSession(session) {
  try {
    session?.acbr?.finalizar?.();
  } catch {}
}
