import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import ACBrLibConsultaCNPJ from "./consultaCnpjLib.js";
import { findIniValue, parseIniLikeResponse } from "./parser.js";

const DEFAULT_CONSULTA_CNPJ_LIB_PATH = "./lib/ACBrLibConsultaCNPJ/MT/libacbrconsultacnpj64.so";
const DEFAULT_PROVIDER = String(process.env.ACBR_CONSULTA_CNPJ_PROVIDER || "1").trim() || "1";
const ACBR_DEBUG_CONFIG = process.env.ACBR_DEBUG_CONFIG === "true";

const resolveAppPath = (value, fallback) => path.resolve(process.cwd(), value || fallback);
const configDir = () => resolveAppPath(process.env.ACBRLIB_CONFIG_DIR, "./config/acbrlib");
const tempDir = () => resolveAppPath(process.env.ACBRLIB_TEMP_DIR, "./temp");

const resolveConsultaCnpjLibPath = () => {
  const configuredPath = String(process.env.ACBRLIB_CONSULTA_CNPJ_PATH || "").trim();
  const resolvedConfiguredPath = configuredPath
    ? path.resolve(process.cwd(), configuredPath)
    : "";
  const fallbackPath = path.resolve(process.cwd(), DEFAULT_CONSULTA_CNPJ_LIB_PATH);

  const preferMtVariant = (sourcePath) => {
    if (!sourcePath) return "";
    const mtPath = sourcePath.replace(`${path.sep}ST${path.sep}`, `${path.sep}MT${path.sep}`);
    if (mtPath !== sourcePath && existsSync(mtPath)) {
      return mtPath;
    }
    return sourcePath;
  };

  if (resolvedConfiguredPath && existsSync(resolvedConfiguredPath)) {
    return preferMtVariant(resolvedConfiguredPath);
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

const setConfigValue = (acbr, sessao, chave, valor) => {
  try {
    acbr.configGravarValor(sessao, chave, String(valor ?? ""));
  } catch (error) {
    if (ACBR_DEBUG_CONFIG) {
      console.error("[acbr:consulta-cnpj] Falha ao gravar configuração", {
        sessao,
        chave,
        valor,
        message: String(error?.message || error),
      });
    }
    throw error;
  }
};

const parseConsultaResponse = (rawText) => {
  const parsedIni = parseIniLikeResponse(rawText);

  return {
    nome_razao: findIniValue(parsedIni, ["RazaoSocial", "Nome", "NomeRazao"], ["Consulta"]) || "",
    nome_fantasia: findIniValue(parsedIni, ["Fantasia", "NomeFantasia"], ["Consulta"]) || "",
    inscricao_estadual:
      findIniValue(parsedIni, ["InscricaoEstadual", "IE"], ["Consulta"]) || "",
    cep: findIniValue(parsedIni, ["CEP"], ["Consulta"]) || "",
    logradouro: findIniValue(parsedIni, ["Endereco", "Logradouro"], ["Consulta"]) || "",
    numero: findIniValue(parsedIni, ["Numero"], ["Consulta"]) || "",
    complemento: findIniValue(parsedIni, ["Complemento"], ["Consulta"]) || "",
    bairro: findIniValue(parsedIni, ["Bairro"], ["Consulta"]) || "",
    cidade: findIniValue(parsedIni, ["Cidade", "Municipio"], ["Consulta"]) || "",
    uf: findIniValue(parsedIni, ["UF"], ["Consulta"]) || "",
    codigo_ibge: findIniValue(parsedIni, ["CodigoMunicipio", "CodMunicipio", "IBGE"], ["Consulta"]) || "",
    situacao: findIniValue(parsedIni, ["Situacao"], ["Consulta"]) || "",
    raw: rawText,
  };
};

class ConsultaCnpjProvider {
  static async consultar({ cnpj, scopeKey }) {
    const normalizedCnpj = String(cnpj || "").replace(/\D/g, "");
    if (normalizedCnpj.length !== 14) {
      throw new Error("CNPJ inválido para consulta.");
    }

    const libraryPath = resolveConsultaCnpjLibPath();
    await fs.access(libraryPath);
    await ensureDir(configDir());
    await ensureDir(tempDir());

    const safeScope = sanitizeScope(scopeKey);
    const rootDir = path.join(tempDir(), "consulta-cnpj", safeScope);
    const logDir = path.join(rootDir, "log");
    const configPath = path.join(configDir(), `consulta-cnpj-${safeScope}.ini`);

    await ensureDir(rootDir);
    await ensureDir(logDir);

    const acbr = new ACBrLibConsultaCNPJ(libraryPath, configPath, "");

    try {
      acbr.inicializar();
      let libVersion = "";
      let openSslInfo = "";

      try {
        libVersion = acbr.versao();
      } catch {}

      try {
        openSslInfo = acbr.openSSLInfo();
      } catch {}

      setConfigValue(acbr, "Principal", "LogPath", logDir);
      setConfigValue(acbr, "Principal", "LogNivel", "4");
      setConfigValue(acbr, "Principal", "TipoResposta", "0");
      setConfigValue(acbr, "Principal", "CodificacaoResposta", "0");
      setConfigValue(acbr, "ConsultaCNPJ", "Provedor", DEFAULT_PROVIDER);

      const usuario = String(process.env.ACBR_CONSULTA_CNPJ_USUARIO || "").trim();
      const senha = String(process.env.ACBR_CONSULTA_CNPJ_SENHA || "").trim();

      if (usuario) {
        setConfigValue(acbr, "ConsultaCNPJ", "Usuario", usuario);
      }

      if (senha) {
        setConfigValue(acbr, "ConsultaCNPJ", "Senha", senha);
      }

      acbr.configGravar();

      if (ACBR_DEBUG_CONFIG) {
        console.error("[acbr:consulta-cnpj] Runtime", {
          provider: DEFAULT_PROVIDER,
          libraryPath,
          libVersion,
          openSslInfo,
          configPath,
          logDir,
        });
      }

      const raw = acbr.consultar(normalizedCnpj);
      return parseConsultaResponse(raw);
    } catch (error) {
      console.error("[acbr:consulta-cnpj] Falha na consulta", {
        provider: DEFAULT_PROVIDER,
        cnpj: normalizedCnpj,
        libraryPath,
        configPath,
        logDir,
        message: error.message || "Falha ao consultar CNPJ.",
      });
      throw error;
    } finally {
      try {
        acbr.finalizar();
      } catch {}
    }
  }
}

export default ConsultaCnpjProvider;
