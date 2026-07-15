import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { env } from "../../config/env.js";
import { getPrinterConfig } from "../printerConfigService.js";

const require = createRequire(import.meta.url);

function resolveAcbrLibRuntimeEntry() {
  try {
    return {
      available: true,
      entryPath: require.resolve("@projetoacbr/acbrlib-nfe-node"),
      legacyEntryPath: null,
      message: null,
    };
  } catch (firstError) {
    try {
      return {
        available: true,
        entryPath: require.resolve("@projetoacbr/acbrlib-nfe-node/dist/src"),
        legacyEntryPath: "@projetoacbr/acbrlib-nfe-node/dist/src",
        message: null,
      };
    } catch {
      return {
        available: false,
        entryPath: null,
        legacyEntryPath: null,
        message: firstError?.message || "Pacote ACBrLibNFe Node não encontrado.",
      };
    }
  }
}

function loadAcbrLibRuntime() {
  try {
    const runtimeModule = require("@projetoacbr/acbrlib-nfe-node");
    return runtimeModule?.default || runtimeModule?.ACBrLibNFeMT || runtimeModule;
  } catch (firstError) {
    try {
      const legacyModule = require("@projetoacbr/acbrlib-nfe-node/dist/src");
      return legacyModule?.default || legacyModule?.ACBrLibNFeMT || legacyModule;
    } catch {
      const error = new Error(
        "A dependência Node da ACBrLibNFe não está instalada no desktop.",
      );
      error.cause = firstError;
      throw error;
    }
  }
}

const DEFAULT_SSL_CONFIG = {
  sslCryptLib: "1",
  sslHttpLib: "3",
  sslXmlSignLib: "4",
  sslType: "5",
};

const WINDOWS_NATIVE_DEPENDENCIES = [
  "libxml2.dll",
  "libiconv.dll",
  "libxslt.dll",
  "libssl-1_1-x64.dll",
  "libcrypto-1_1-x64.dll",
];

const ensureDir = async (targetPath) => {
  await fs.mkdir(targetPath, { recursive: true });
};

const escapeIniValue = (value) =>
  String(value ?? "")
    .replace(/\r?\n/g, " ")
    .trim();

function normalizePathList(value) {
  return String(value || "")
    .split(path.delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
}

function configureNativeDependencyPath() {
  if (process.platform !== "win32") return;

  const currentPaths = normalizePathList(process.env.PATH);
  const missingPaths = env.acbrLibNativeDependencyDirs.filter(
    (dependencyDir) => !currentPaths.some((currentPath) => currentPath.toLowerCase() === dependencyDir.toLowerCase()),
  );

  if (!missingPaths.length) return;

  process.env.PATH = [...missingPaths, ...currentPaths].join(path.delimiter);
}

function getWindowsNativeDependencyStatus() {
  if (process.platform !== "win32") {
    return {
      required: false,
      dirs: [],
      missing: [],
    };
  }

  const found = new Set();
  for (const dependencyDir of env.acbrLibNativeDependencyDirs) {
    for (const dependency of WINDOWS_NATIVE_DEPENDENCIES) {
      if (existsSync(path.join(dependencyDir, dependency))) {
        found.add(dependency.toLowerCase());
      }
    }
  }

  return {
    required: true,
    dirs: env.acbrLibNativeDependencyDirs,
    missing: WINDOWS_NATIVE_DEPENDENCIES.filter((dependency) => !found.has(dependency.toLowerCase())),
  };
}

const mapAcbrAmbiente = (value) => (String(value || "2") === "1" ? "0" : "1");

const resolveSslConfig = () => ({
  sslCryptLib: String(process.env.V12_ACBR_DFE_SSL_CRYPT_LIB || DEFAULT_SSL_CONFIG.sslCryptLib),
  sslHttpLib: String(process.env.V12_ACBR_DFE_SSL_HTTP_LIB || DEFAULT_SSL_CONFIG.sslHttpLib),
  sslXmlSignLib: String(process.env.V12_ACBR_DFE_SSL_XML_SIGN_LIB || DEFAULT_SSL_CONFIG.sslXmlSignLib),
  sslType: String(process.env.V12_ACBR_NFE_SSL_TYPE || DEFAULT_SSL_CONFIG.sslType),
});

export function getAcbrLibDiagnostics() {
  const runtimeEntry = resolveAcbrLibRuntimeEntry();
  configureNativeDependencyPath();
  let packageAvailable = runtimeEntry.available;
  let packageMessage = runtimeEntry.message;

  try {
    loadAcbrLibRuntime();
  } catch (error) {
    packageAvailable = false;
    packageMessage = error.message;
  }

  return {
    mode: env.acbrMode,
    packageAvailable,
    packageMessage,
    packageEntryPath: runtimeEntry.entryPath,
    packageLegacyEntryPath: runtimeEntry.legacyEntryPath,
    libPath: env.acbrLibPath,
    libExists: existsSync(env.acbrLibPath),
    schemaPath: env.acbrLibSchemaPath,
    schemaExists: existsSync(env.acbrLibSchemaPath),
    iniServicosPath: env.acbrLibIniServicosPath,
    iniServicosExists: existsSync(env.acbrLibIniServicosPath),
    configDir: env.acbrLibConfigDir,
    tempDir: env.acbrLibTempDir,
    logDir: env.acbrLibLogDir,
    nativeDependencies: getWindowsNativeDependencyStatus(),
  };
}

export async function ensureAcbrLibRuntime() {
  configureNativeDependencyPath();
  loadAcbrLibRuntime();

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
  if (valor === undefined || valor === null || valor === "") return;
  try {
    acbr.configGravarValor(sessao, chave, String(valor));
  } catch (error) {
    const message = String(error?.message || error);
    if (/Chave .* não existe na Sessão|Chave .* nao existe na Sessao|Sessão .* não existe|Sessao .* nao existe/i.test(message)) {
      return;
    }
    throw new Error(
      `Falha ao gravar configuração ACBr [${sessao}] ${chave}: ${message}`,
    );
  }
}

function buildBaseNfceConfig({
  logDir,
  schemaDir,
  certPath = "",
  certificadoSenha = "",
  xmlDir = "",
  pdfDir = "",
  uf = "",
  ambiente = "2",
  iniServicosPath = "",
}) {
  const sslConfig = resolveSslConfig();

  return `[Principal]
TipoResposta=0
CodificacaoResposta=0
LogNivel=4
LogPath=${escapeIniValue(logDir)}

[DFe]
SSLCryptLib=${escapeIniValue(sslConfig.sslCryptLib)}
SSLHttpLib=${escapeIniValue(sslConfig.sslHttpLib)}
SSLXmlSignLib=${escapeIniValue(sslConfig.sslXmlSignLib)}
UF=${escapeIniValue(String(uf || "").toUpperCase())}
ArquivoPFX=${escapeIniValue(certPath)}
Senha=${escapeIniValue(certificadoSenha)}

[NFe]
Ambiente=${escapeIniValue(mapAcbrAmbiente(ambiente))}
FormaEmissao=0
ModeloDF=1
VersaoDF=3
SSLType=${escapeIniValue(sslConfig.sslType)}
PathSchemas=${escapeIniValue(schemaDir)}
PathSalvar=${escapeIniValue(xmlDir)}
PathNFe=${escapeIniValue(xmlDir)}
IniServicos=${escapeIniValue(iniServicosPath)}
SepararPorCNPJ=1

[DANFE]
PathPDF=${escapeIniValue(pdfDir)}

[Arquivos]
Salvar=1
PathSalvar=${escapeIniValue(xmlDir)}
PathSchemas=${escapeIniValue(schemaDir)}

[Geral]
PathSchemas=${escapeIniValue(schemaDir)}
IniServicos=${escapeIniValue(iniServicosPath)}

[Certificado]
ArquivoPFX=${escapeIniValue(certPath)}
Senha=${escapeIniValue(certificadoSenha)}
`;
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
  formaEmissao = "0",
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
  await fs.writeFile(
    configPath,
    buildBaseNfceConfig({
      logDir,
      schemaDir: env.acbrLibSchemaPath,
      certPath,
      certificadoSenha,
      xmlDir,
      pdfDir,
      uf: emitenteUf,
      ambiente,
      iniServicosPath: env.acbrLibIniServicosPath,
    }),
    "utf8",
  );

  const ACBrLibNFeMT = loadAcbrLibRuntime();
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

  applyConfig(acbr, "NFe", "Ambiente", mapAcbrAmbiente(ambiente));
  applyConfig(acbr, "NFe", "FormaEmissao", formaEmissao);
  applyConfig(acbr, "NFe", "ModeloDF", "1");
  applyConfig(acbr, "NFe", "VersaoDF", "3");
  applyConfig(acbr, "NFe", "SSLType", sslConfig.sslType);
  applyConfig(acbr, "NFe", "PathSchemas", env.acbrLibSchemaPath);
  applyConfig(acbr, "NFe", "PathSalvar", xmlDir);
  applyConfig(acbr, "NFe", "PathNFe", xmlDir);
  applyConfig(acbr, "NFe", "IniServicos", env.acbrLibIniServicosPath);

  applyConfig(acbr, "Arquivos", "Salvar", "1");
  applyConfig(acbr, "Arquivos", "PathSalvar", xmlDir);
  applyConfig(acbr, "Arquivos", "PathSchemas", env.acbrLibSchemaPath);
  applyConfig(acbr, "Geral", "PathSchemas", env.acbrLibSchemaPath);
  applyConfig(acbr, "Geral", "IniServicos", env.acbrLibIniServicosPath);
  applyConfig(acbr, "Certificado", "ArquivoPFX", certPath);
  applyConfig(acbr, "Certificado", "Senha", certificadoSenha || "");

  configurePrinter(acbr, pdfDir);
  acbr.configGravar();

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
