import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import MdfeIntegrationDAO from "../../model/mdfeIntegrationDAO.js";
import { decryptSecret } from "../../utils/secret.js";
import { findIniValue, parseIniLikeResponse } from "./parser.js";
import {
  configureMdfeStatusSession,
  createMdfeStatusSession,
  destroyMdfeSession,
  getMdfeRuntimeDiagnostics,
} from "./mdfeRuntime.js";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MDFE_NATIVE_WORKER_PATH = path.join(__dirname, "mdfeNativeWorker.js");

class AcbrLibMdfeNotConfiguredError extends Error {
  constructor(message = "ACBrLibMDFe não configurada neste ambiente.") {
    super(message);
    this.name = "AcbrLibMdfeNotConfiguredError";
    this.code = "ACBRLIB_MDFE_NOT_CONFIGURED";
  }
}

class AcbrLibMdfeIntegrationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "AcbrLibMdfeIntegrationError";
    this.code = "ACBRLIB_MDFE_INTEGRATION_ERROR";
    this.details = details;
  }
}

const isEnabled = () => String(process.env.ACBRLIB_ENABLED || "").toLowerCase() === "true";

const safeParseInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const safeReadJsonFile = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
};

const normalizeContextForWorker = (context) => ({
  ...context,
  certificado: {},
});

const runMdfeEmissionWorker = async ({ tenantId, mdfeId, context, certificadoSenha }) => {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `v12-mdfe-${tenantId}-${mdfeId}-`));
  const inputPath = path.join(workDir, "input.json");
  const outputPath = path.join(workDir, "output.json");
  const certificadoBase64 = Buffer.from(context.certificado.conteudo_pfx).toString("base64");

  await fs.writeFile(
    inputPath,
    JSON.stringify({
      tenantId,
      mdfeId,
      context: normalizeContextForWorker(context),
      certificadoBase64,
      certificadoSenha,
    }),
    "utf8"
  );

  try {
    const { stderr } = await execFileAsync(process.execPath, [MDFE_NATIVE_WORKER_PATH, inputPath, outputPath], {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
      timeout: 120000,
    });

    if (stderr) {
      console.error(stderr.trim());
    }

    const result = await safeReadJsonFile(outputPath);
    if (!result?.ok) {
      throw new AcbrLibMdfeIntegrationError(
        result?.message || "Falha ao emitir MDF-e com a ACBrLibMDFe.",
        { mdfeId, tenantId, workerResult: result }
      );
    }

    return result;
  } catch (error) {
    const result = await safeReadJsonFile(outputPath);
    const signal = error.signal ? ` (signal: ${error.signal})` : "";
    const stderr = String(error.stderr || "").trim();
    const crashedNative =
      error.signal ||
      error.code === 139 ||
      /segmentation fault|core dumped|sigsegv/i.test(stderr);
    const message =
      result?.lastReturn ||
      result?.message ||
      stderr ||
      (crashedNative
        ? `A ACBrLibMDFe falhou durante a emissão do MDF-e${signal}.`
        : `A ACBrLibMDFe falhou durante a emissão do MDF-e${signal}.`);

    throw new AcbrLibMdfeIntegrationError(message, {
      mdfeId,
      tenantId,
      workerResult: result,
      signal: error.signal || null,
      stderr,
    });
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
};

const findInMdfeSections = (sections, keys = []) => {
  const normalizedKeys = keys.map((key) => String(key).toLowerCase());

  for (const [section, values] of Object.entries(sections || {})) {
    if (!/^MDFe/i.test(section)) continue;

    for (const [key, value] of Object.entries(values || {})) {
      if (normalizedKeys.includes(String(key).toLowerCase())) return value;
    }
  }

  return null;
};

const mapMdfeReturnToStatus = ({ cStat }) => {
  const code = String(cStat || "").trim();
  if (["100", "150"].includes(code)) return "autorizado";
  if (["103", "104", "105", "106"].includes(code)) return "validado";
  if (code) return "rejeitado";
  return "rejeitado";
};

const buildMdfeResponseMetadata = (rawText) => {
  const parsed = parseIniLikeResponse(rawText);
  const cStat =
    findInMdfeSections(parsed, ["cStat", "CStat"]) ||
    findIniValue(parsed, ["CStat", "cStat", "Status"], ["Retorno", "Envio"]);
  const xMotivo =
    findInMdfeSections(parsed, ["xMotivo", "XMotivo", "Msg"]) ||
    findIniValue(parsed, ["xMotivo", "XMotivo", "Motivo", "Msg"], ["Retorno", "Envio"]);
  const recibo = findIniValue(parsed, ["NRec", "nRec", "Recibo"], ["Retorno", "Envio"]);
  const protocolo =
    findInMdfeSections(parsed, ["nProt", "NProt", "Protocolo"]) ||
    findIniValue(parsed, ["Protocolo", "nProt", "NProt"], ["Retorno"]);
  const chaveAcesso =
    findInMdfeSections(parsed, ["chMDFe", "ChMDFe", "ChaveDFe", "chDFe"]) ||
    findIniValue(parsed, ["ChaveDFe", "chMDFe", "ChMDFe", "chDFe"], ["Retorno"]);
  const numero = findIniValue(parsed, ["nMDF", "Numero"]);

  return {
    operation: "emitir",
    raw: rawText,
    parsed,
    cStat: cStat || null,
    xMotivo: xMotivo || null,
    recibo: recibo || null,
    protocolo: protocolo || null,
    chaveAcesso: chaveAcesso || null,
    numero: safeParseInteger(numero),
    mappedStatus: mapMdfeReturnToStatus({ cStat }),
  };
};

const persistMdfeSuccess = async (client, { context, userId, metadata, preXml, postXml }) => {
  await client.query("BEGIN");

  try {
    await MdfeIntegrationDAO.atualizarMdfe(client, context.mdfe.mdfe_id, {
      status: metadata.mappedStatus,
      recibo: metadata.recibo,
      protocolo: metadata.protocolo,
      chave_acesso: metadata.chaveAcesso || context.mdfe.chave_acesso || null,
      numero: metadata.numero || context.mdfe.numero,
      xml_assinado: preXml || undefined,
      xml_autorizado: metadata.mappedStatus === "autorizado" ? postXml || undefined : undefined,
    });

    await MdfeIntegrationDAO.registrarEvento(client, {
      mdfeId: context.mdfe.mdfe_id,
      usuarioId: userId,
      tipoEvento: "emissao_retorno",
      status: metadata.mappedStatus === "autorizado" ? "sucesso" : "falha",
      mensagem: metadata.xMotivo || "Retorno da emissão do MDF-e.",
      respostaJson: metadata,
    });

    await MdfeIntegrationDAO.salvarXml(client, {
      mdfeId: context.mdfe.mdfe_id,
      tipoXml: "pre_envio",
      conteudoXml: preXml,
    });

    await MdfeIntegrationDAO.salvarXml(client, {
      mdfeId: context.mdfe.mdfe_id,
      tipoXml: metadata.mappedStatus === "autorizado" ? "autorizado" : "retorno_autorizacao",
      conteudoXml: postXml,
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
};

const persistMdfeFailure = async (client, { context, userId, error, responseText, preXml }) => {
  await client.query("BEGIN");

  try {
    await MdfeIntegrationDAO.atualizarMdfe(client, context.mdfe.mdfe_id, {
      status: "rejeitado",
    });

    await MdfeIntegrationDAO.registrarEvento(client, {
      mdfeId: context.mdfe.mdfe_id,
      usuarioId: userId,
      tipoEvento: "emissao_retorno",
      status: "falha",
      mensagem: error.message || "Falha na integração com ACBrLibMDFe.",
      respostaJson: responseText ? { raw: responseText } : null,
    });

    await MdfeIntegrationDAO.salvarXml(client, {
      mdfeId: context.mdfe.mdfe_id,
      tipoXml: "pre_envio",
      conteudoXml: preXml,
    });

    await client.query("COMMIT");
  } catch (persistError) {
    await client.query("ROLLBACK");
    throw persistError;
  }
};

const assertConfigured = () => {
  if (!isEnabled()) {
    throw new AcbrLibMdfeNotConfiguredError(
      "ACBrLib desativada. Configure ACBRLIB_ENABLED=true no .env da VPS e recrie o container v12-acbr."
    );
  }

  const diagnostics = getMdfeRuntimeDiagnostics();
  if (!diagnostics.libExists) {
    throw new AcbrLibMdfeNotConfiguredError(
      `Biblioteca ACBrLibMDFe não encontrada em ${diagnostics.libPath}. Ajuste ACBRLIB_MDFE_PATH no .env.`
    );
  }

  if (!diagnostics.schemaExists) {
    throw new AcbrLibMdfeNotConfiguredError(
      `Schemas MDF-e não encontrados em ${diagnostics.schemaDir}. Ajuste ACBRLIB_MDFE_SCHEMA_PATH no .env.`
    );
  }
};

class AcbrLibMdfeProvider {
  static diagnostics() {
    return getMdfeRuntimeDiagnostics();
  }

  static ensureConfigured() {
    assertConfigured();
  }

  static async consultarStatusServico({ client, tenantId, userId = null }) {
    this.ensureConfigured();

    const context = await MdfeIntegrationDAO.carregarContextoStatus(client);
    const certificadoSenha = decryptSecret(context.certificado.senha_criptografada);
    const session = await createMdfeStatusSession({
      tenantId,
      certificadoBuffer: Buffer.from(context.certificado.conteudo_pfx),
      certificadoSenha,
      uf: context.uf,
      ambiente: context.ambiente,
    });

    try {
      await configureMdfeStatusSession(session);
      const rawResponse = session.acbr.statusServico();

      return {
        success: true,
        raw: rawResponse,
        uf: context.uf,
        ambiente: context.ambiente,
      };
    } catch (error) {
      throw new AcbrLibMdfeIntegrationError(
        error.message || "Falha ao consultar status do serviço MDF-e com a ACBrLibMDFe.",
        {
          tenantId,
          uf: context.uf,
          ambiente: context.ambiente,
        }
      );
    } finally {
      await destroyMdfeSession(session);
    }
  }

  static async emitirMdfe({ client, mdfeId, tenantId, userId = null }) {
    this.ensureConfigured();

    await client.query("BEGIN");
    let context;

    try {
      await MdfeIntegrationDAO.reservarNumero(client, mdfeId);
      context = await MdfeIntegrationDAO.carregarContexto(client, mdfeId);
      MdfeIntegrationDAO.validarContexto(context);

      await MdfeIntegrationDAO.atualizarMdfe(client, mdfeId, {
        status: "validado",
      });

      await MdfeIntegrationDAO.registrarEvento(client, {
        mdfeId,
        usuarioId: userId,
        tipoEvento: "emissao_iniciada",
        status: "processando",
        mensagem: "Processo de emissão do MDF-e iniciado na ACBrLibMDFe.",
        payloadJson: { tenantId, numero: context.mdfe.numero },
      });

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    let preXml = null;
    let lastReturn = null;

    try {
      const workerResult = await runMdfeEmissionWorker({
        tenantId,
        mdfeId,
        context,
        certificadoSenha: decryptSecret(context.certificado.senha_criptografada),
      });

      preXml = workerResult.preXml;
      const metadata = buildMdfeResponseMetadata(workerResult.rawResponse);

      await persistMdfeSuccess(client, {
        context,
        userId,
        metadata,
        preXml,
        postXml: workerResult.postXml,
      });

      return {
        success: metadata.mappedStatus === "autorizado",
        ...metadata,
      };
    } catch (error) {
      const workerResult = error.details?.workerResult || null;
      preXml = workerResult?.preXml || preXml;
      lastReturn = workerResult?.lastReturn || error.details?.stderr || null;

      await persistMdfeFailure(client, {
        context,
        userId,
        error,
        responseText: lastReturn,
        preXml,
      });

      throw new AcbrLibMdfeIntegrationError(
        lastReturn || error.message || "Falha ao emitir MDF-e com a ACBrLibMDFe.",
        { mdfeId, tenantId, workerResult, signal: error.details?.signal || null }
      );
    }
  }
}

export {
  AcbrLibMdfeProvider,
  AcbrLibMdfeNotConfiguredError,
  AcbrLibMdfeIntegrationError,
};
