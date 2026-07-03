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
  configureMdfeEmissionSession,
  configureMdfeStatusSession,
  createMdfeEmissionSession,
  createMdfeStatusSession,
  destroyMdfeSession,
  getMdfeRuntimeDiagnostics,
} from "./mdfeRuntime.js";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MDFE_NATIVE_WORKER_PATH = path.join(__dirname, "mdfeNativeWorker.js");
const DAMDFE_NATIVE_WORKER_PATH = path.join(__dirname, "damdfeNativeWorker.js");

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

const isPdfBase64 = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return false;

  try {
    return Buffer.from(raw, "base64").subarray(0, 4).toString("utf8") === "%PDF";
  } catch {
    return false;
  }
};

const runDamdfeWorker = async ({ tenantId, mdfeId, context, certificadoSenha, xmlAutorizado }) => {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `v12-damdfe-${tenantId}-${mdfeId}-`));
  const inputPath = path.join(workDir, "input.json");
  const outputPath = path.join(workDir, "output.json");
  const certificadoBase64 = context.certificado?.conteudo_pfx
    ? Buffer.from(context.certificado.conteudo_pfx).toString("base64")
    : "";

  await fs.writeFile(
    inputPath,
    JSON.stringify({
      tenantId,
      mdfeId,
      context: normalizeContextForWorker(context),
      certificadoBase64,
      certificadoSenha,
      xmlAutorizado,
    }),
    "utf8"
  );

  try {
    const { stderr } = await execFileAsync(process.execPath, [DAMDFE_NATIVE_WORKER_PATH, inputPath, outputPath], {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
      timeout: 120000,
    });

    if (stderr) {
      console.error(stderr.trim());
    }

    const result = await safeReadJsonFile(outputPath);
    if (!result?.ok || !result.pdfBase64) {
      const lastReturn = isPdfBase64(result?.lastReturn) ? "" : result?.lastReturn;
      throw new AcbrLibMdfeIntegrationError(
        result?.message || lastReturn || "Falha ao gerar DAMDFE com a ACBrLibMDFe.",
        { mdfeId, tenantId, workerResult: result }
      );
    }

    return {
      ...result,
      pdfBuffer: Buffer.from(result.pdfBase64, "base64"),
    };
  } catch (error) {
    const result = await safeReadJsonFile(outputPath);
    const signal = error.signal ? ` (signal: ${error.signal})` : "";
    const stderr = String(error.stderr || "").trim();
    const lastReturn = isPdfBase64(result?.lastReturn) ? "" : result?.lastReturn;
    const message =
      result?.message ||
      lastReturn ||
      stderr ||
      `A ACBrLibMDFe falhou durante a geração do DAMDFE${signal}.`;

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

const findAcbrInlineValue = (rawText, key) => {
  const text = String(rawText || "").replace(/\r?\n/g, " ").trim();
  const escapedKey = String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`(?:^|\\s)${escapedKey}=([\\s\\S]*?)(?=\\s+[A-Za-z][A-Za-z0-9]*=|$)`, "i"));
  return match?.[1]?.trim() || null;
};

const buildMdfeStatusMetadata = (rawText, context = {}) => {
  const parsed = parseIniLikeResponse(rawText);
  const cStat =
    findIniValue(parsed, ["CStat", "cStat", "Status"], ["Status"]) ||
    findAcbrInlineValue(rawText, "CStat");
  const xMotivo =
    findIniValue(parsed, ["XMotivo", "xMotivo", "Motivo", "Msg"], ["Status"]) ||
    findAcbrInlineValue(rawText, "XMotivo") ||
    findAcbrInlineValue(rawText, "Msg");
  const cUf = findIniValue(parsed, ["CUF", "cUF"], ["Status"]) || findAcbrInlineValue(rawText, "CUF");
  const dhRecbto =
    findIniValue(parsed, ["DhRecbto", "dhRecbto"], ["Status"]) || findAcbrInlineValue(rawText, "DhRecbto");
  const tpAmb =
    findIniValue(parsed, ["TpAmb", "tpAmb"], ["Status"]) || findAcbrInlineValue(rawText, "TpAmb");
  const verAplic =
    findIniValue(parsed, ["VerAplic", "verAplic"], ["Status"]) || findAcbrInlineValue(rawText, "VerAplic");
  const versao =
    findIniValue(parsed, ["Versao", "versao"], ["Status"]) || findAcbrInlineValue(rawText, "Versao");
  const tMed = findIniValue(parsed, ["TMed", "tMed"], ["Status"]) || findAcbrInlineValue(rawText, "TMed");
  const statusOk = String(cStat || "").trim() === "107";

  return {
    success: statusOk,
    operation: "status_servico",
    raw: rawText,
    parsed,
    cStat: cStat || null,
    xMotivo: xMotivo || null,
    cUf: cUf || null,
    uf: context.uf || null,
    ambiente: context.ambiente || null,
    tpAmb: tpAmb || null,
    dhRecbto: dhRecbto || null,
    verAplic: verAplic || null,
    versao: versao || null,
    tMed: tMed || null,
    mappedStatus: statusOk ? "operacional" : "falha",
  };
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

const buildMdfeEventMetadata = (rawText, operation) => {
  const parsed = parseIniLikeResponse(rawText);
  const cStat = findIniValue(parsed, ["CStat", "cStat", "Status"], [
    "Encerramento",
    "Cancelamento",
    "Evento001",
    "Evento",
  ]);
  const xMotivo = findIniValue(parsed, ["XMotivo", "xMotivo", "Motivo", "Msg"], [
    "Encerramento",
    "Cancelamento",
    "Evento001",
    "Evento",
  ]);
  const protocolo = findIniValue(parsed, ["NProt", "nProt", "Protocolo"], [
    "Encerramento",
    "Cancelamento",
    "Evento001",
  ]);
  const chaveAcesso = findIniValue(parsed, ["ChMDFe", "chMDFe", "ChaveDFe", "chDFe"], [
    "Encerramento",
    "Cancelamento",
    "Evento001",
  ]);
  const tipoEvento = findIniValue(parsed, ["TpEvento", "tpEvento"], [
    "Encerramento",
    "Cancelamento",
    "Evento001",
  ]);
  const xml = findIniValue(parsed, ["XML", "Xml"], ["Encerramento", "Cancelamento", "Evento001"]);

  return {
    operation,
    raw: rawText,
    parsed,
    cStat: cStat || null,
    xMotivo: xMotivo || null,
    protocolo: protocolo || null,
    chaveAcesso: chaveAcesso || null,
    tipoEvento: tipoEvento || null,
    xml: xml || null,
    success: ["135", "136", "155"].includes(String(cStat || "").trim()),
  };
};

const formatDateBr = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
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

  if (!diagnostics.servicosExists) {
    throw new AcbrLibMdfeNotConfiguredError(
      `Arquivo de serviços MDF-e não encontrado em ${diagnostics.servicosPath}. Ajuste ACBRLIB_MDFE_SERVICOS_PATH no .env.`
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
      const metadata = buildMdfeStatusMetadata(rawResponse, context);

      return {
        ...metadata,
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

  static async gerarDamdfePdf({ client, mdfeId, tenantId }) {
    this.ensureConfigured();

    const context = await MdfeIntegrationDAO.carregarContexto(client, mdfeId);

    if (!["autorizado", "encerrado"].includes(String(context.mdfe.status || "").toLowerCase())) {
      throw new AcbrLibMdfeIntegrationError("DAMDFE disponível apenas para MDF-e autorizado ou encerrado.", {
        mdfeId,
        tenantId,
      });
    }

    const assets = await MdfeIntegrationDAO.carregarDamdfeAssets(client, mdfeId);
    if (!assets.xml?.conteudo_xml) {
      throw new AcbrLibMdfeIntegrationError("O MDF-e autorizado ainda não possui XML salvo.", {
        mdfeId,
        tenantId,
      });
    }

    const workerResult = await runDamdfeWorker({
      tenantId,
      mdfeId,
      context,
      certificadoSenha: context.certificado?.senha_criptografada
        ? decryptSecret(context.certificado.senha_criptografada)
        : "",
      xmlAutorizado: assets.xml.conteudo_xml,
    });

    return {
      filename: `damdfe-mdfe-${context.mdfe.numero || mdfeId}.pdf`,
      buffer: workerResult.pdfBuffer,
      pdfPath: workerResult.pdfPath,
    };
  }

  static async encerrarMdfe({ client, mdfeId, tenantId, userId = null, payload = {} }) {
    this.ensureConfigured();

    const context = await MdfeIntegrationDAO.carregarContexto(client, mdfeId);
    const encerramento = MdfeIntegrationDAO.validarContextoEncerramento(context, payload);
    const session = await createMdfeEmissionSession({
      tenantId,
      mdfeId,
      certificadoBuffer: context.certificado.conteudo_pfx,
      certificadoSenha: decryptSecret(context.certificado.senha_criptografada),
    });

    try {
      await configureMdfeEmissionSession(session, context);
      const rawResponse = session.acbr.encerrarMdfe(
        context.mdfe.chave_acesso,
        formatDateBr(),
        encerramento.municipio_codigo,
        context.emitente.cpf_cnpj.replace(/\D/g, ""),
        context.mdfe.protocolo
      );
      const metadata = buildMdfeEventMetadata(rawResponse, "encerrar");

      await client.query("BEGIN");
      try {
        if (metadata.success) {
          await MdfeIntegrationDAO.marcarEncerrado(client, mdfeId, encerramento);
        }

        await MdfeIntegrationDAO.registrarEvento(client, {
          mdfeId,
          usuarioId: userId,
          tipoEvento: "encerramento_retorno",
          status: metadata.success ? "sucesso" : "falha",
          mensagem: metadata.xMotivo || "Retorno do encerramento do MDF-e.",
          payloadJson: encerramento,
          respostaJson: metadata,
        });

        await MdfeIntegrationDAO.salvarXml(client, {
          mdfeId,
          tipoXml: "encerramento",
          conteudoXml: metadata.xml,
        });

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }

      return metadata;
    } catch (error) {
      const lastReturn = session.acbr?.ultimoRetorno?.() || null;
      throw new AcbrLibMdfeIntegrationError(
        lastReturn || error.message || "Falha ao encerrar MDF-e com a ACBrLibMDFe.",
        { mdfeId, tenantId }
      );
    } finally {
      await destroyMdfeSession(session);
    }
  }

  static async cancelarMdfe({ client, mdfeId, tenantId, userId = null, payload = {} }) {
    this.ensureConfigured();

    const context = await MdfeIntegrationDAO.carregarContexto(client, mdfeId);
    const cancelamento = MdfeIntegrationDAO.validarContextoCancelamento(context, payload);
    const session = await createMdfeEmissionSession({
      tenantId,
      mdfeId,
      certificadoBuffer: context.certificado.conteudo_pfx,
      certificadoSenha: decryptSecret(context.certificado.senha_criptografada),
    });

    try {
      await configureMdfeEmissionSession(session, context);
      const rawResponse = session.acbr.cancelar(
        context.mdfe.chave_acesso,
        cancelamento.justificativa,
        context.emitente.cpf_cnpj.replace(/\D/g, ""),
        1
      );
      const metadata = buildMdfeEventMetadata(rawResponse, "cancelar");

      await client.query("BEGIN");
      try {
        if (metadata.success) {
          await MdfeIntegrationDAO.marcarCancelado(client, mdfeId);
        }

        await MdfeIntegrationDAO.registrarEvento(client, {
          mdfeId,
          usuarioId: userId,
          tipoEvento: "cancelamento_retorno",
          status: metadata.success ? "sucesso" : "falha",
          mensagem: metadata.xMotivo || "Retorno do cancelamento do MDF-e.",
          payloadJson: cancelamento,
          respostaJson: metadata,
        });

        await MdfeIntegrationDAO.salvarXml(client, {
          mdfeId,
          tipoXml: "cancelamento",
          conteudoXml: metadata.xml,
        });

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }

      return metadata;
    } catch (error) {
      const lastReturn = session.acbr?.ultimoRetorno?.() || null;
      throw new AcbrLibMdfeIntegrationError(
        lastReturn || error.message || "Falha ao cancelar MDF-e com a ACBrLibMDFe.",
        { mdfeId, tenantId }
      );
    } finally {
      await destroyMdfeSession(session);
    }
  }
}

export {
  AcbrLibMdfeProvider,
  AcbrLibMdfeNotConfiguredError,
  AcbrLibMdfeIntegrationError,
};
