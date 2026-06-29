import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import AcbrNfeIntegrationDAO from "../../model/acbrNfeIntegrationDAO.js";
import { decryptSecret } from "../../utils/secret.js";
import { findIniValue, mapNfeReturnToStatus, parseIniLikeResponse } from "./parser.js";
import {
  configureAcbrSession,
  createAcbrSession,
  destroyAcbrSession,
  getAcbrRuntimeDiagnostics,
} from "./runtime.js";
import { getCufByUf } from "../../utils/ufCodes.js";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NFE_NATIVE_WORKER_PATH = path.join(__dirname, "nfeNativeWorker.js");
const DANFE_NATIVE_WORKER_PATH = path.join(__dirname, "danfeNativeWorker.js");
const NFE_DISTRIBUICAO_WORKER_PATH = path.join(__dirname, "nfeDistribuicaoWorker.js");

class AcbrLibNotConfiguredError extends Error {
  constructor(message = "ACBrLib não configurada neste ambiente.") {
    super(message);
    this.name = "AcbrLibNotConfiguredError";
    this.code = "ACBRLIB_NOT_CONFIGURED";
  }
}

class AcbrLibIntegrationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "AcbrLibIntegrationError";
    this.code = "ACBRLIB_INTEGRATION_ERROR";
    this.details = details;
  }
}

const isEnabled = () => String(process.env.ACBRLIB_ENABLED || "").toLowerCase() === "true";

const safeParseInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const extractXmlTag = (value, tagName) => {
  const text = String(value || "");
  const match = text.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1]?.trim() || "";
};

const logAcbrStep = (step, details = {}) => {
  console.error("[acbr:nfe:step]", {
    step,
    ...details,
  });
};

const normalizeContextForWorker = (context) => ({
  ...context,
  certificado: {
    nome_arquivo: context.certificado?.nome_arquivo || "",
  },
});

const safeReadJsonFile = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
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

const runNfeEmissionWorker = async ({ tenantId, nfeId, context, certificadoSenha }) => {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `v12-nfe-${tenantId}-${nfeId}-`));
  const inputPath = path.join(workDir, "input.json");
  const outputPath = path.join(workDir, "output.json");
  const certificadoBase64 = Buffer.from(context.certificado.conteudo_pfx).toString("base64");

  await fs.writeFile(
    inputPath,
    JSON.stringify({
      tenantId,
      nfeId,
      context: normalizeContextForWorker(context),
      certificadoBase64,
      certificadoSenha,
    }),
    "utf8"
  );

  try {
    const { stderr } = await execFileAsync(process.execPath, [NFE_NATIVE_WORKER_PATH, inputPath, outputPath], {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000,
    });

    if (stderr) {
      console.error(stderr.trim());
    }

    const result = await safeReadJsonFile(outputPath);
    if (!result?.ok) {
      throw new AcbrLibIntegrationError(result?.message || "Falha ao emitir NF-e com a ACBrLib.", {
        nfeId,
        tenantId,
        workerResult: result,
      });
    }

    return result;
  } catch (error) {
    const result = await safeReadJsonFile(outputPath);
    const signal = error.signal ? ` (signal: ${error.signal})` : "";
    const stderr = String(error.stderr || "").trim();
    const crashedNative =
      error.signal ||
      error.code === 139 ||
      result?.stage === "before_assinar" ||
      /segmentation fault|core dumped|sigsegv/i.test(stderr);
    const nativeCrashMessage = crashedNative
      ? `A ACBrLib falhou durante a assinatura/envio da NF-e${signal}. O serviço permaneceu ativo; verifique o evento de erro e os logs do ACBr.`
      : "";
    const message =
      nativeCrashMessage ||
      result?.lastReturn ||
      result?.message ||
      stderr ||
      `A ACBrLib falhou durante a emissão da NF-e${signal}.`;

    throw new AcbrLibIntegrationError(message, {
      nfeId,
      tenantId,
      workerResult: result,
      signal: error.signal || null,
      stderr,
    });
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
};

const runDanfeWorker = async ({
  tenantId,
  nfeId,
  context,
  certificadoSenha,
  xmlAutorizado,
  logo,
}) => {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `v12-danfe-${tenantId}-${nfeId}-`));
  const inputPath = path.join(workDir, "input.json");
  const outputPath = path.join(workDir, "output.json");
  const certificadoBase64 = context.certificado?.conteudo_pfx
    ? Buffer.from(context.certificado.conteudo_pfx).toString("base64")
    : "";

  await fs.writeFile(
    inputPath,
    JSON.stringify({
      tenantId,
      nfeId,
      context: normalizeContextForWorker(context),
      certificadoBase64,
      certificadoSenha,
      xmlAutorizado,
      logoBase64: logo?.conteudo ? Buffer.from(logo.conteudo).toString("base64") : "",
      logoMimeType: logo?.mime_type || "",
      logoNomeArquivo: logo?.nome_arquivo || "",
    }),
    "utf8"
  );

  try {
    const { stderr } = await execFileAsync(process.execPath, [DANFE_NATIVE_WORKER_PATH, inputPath, outputPath], {
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
      throw new AcbrLibIntegrationError(result?.message || lastReturn || "Falha ao gerar DANFE com a ACBrLib.", {
        nfeId,
        tenantId,
        workerResult: result,
      });
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
    const crashedNative =
      error.signal ||
      error.code === 139 ||
      /segmentation fault|core dumped|sigsegv/i.test(stderr);
    const message =
      result?.message ||
      lastReturn ||
      stderr ||
      (crashedNative
        ? `A ACBrLib falhou durante a geração do DANFE${signal}.`
        : `A ACBrLib falhou durante a geração do DANFE${signal}.`);

    throw new AcbrLibIntegrationError(message, {
      nfeId,
      tenantId,
      workerResult: result,
      signal: error.signal || null,
      stderr,
    });
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
};

const runDistribuicaoWorker = async ({
  tenantId,
  chaveAcesso,
  cufAutor,
  cnpjCpfAutor,
  uf,
  ambiente,
  certificadoBuffer,
  certificadoSenha,
}) => {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `v12-dist-${tenantId}-`));
  const inputPath = path.join(workDir, "input.json");
  const outputPath = path.join(workDir, "output.json");

  await fs.writeFile(
    inputPath,
    JSON.stringify({
      tenantId,
      chaveAcesso,
      cufAutor,
      cnpjCpfAutor,
      uf,
      ambiente,
      certificadoBase64: Buffer.from(certificadoBuffer).toString("base64"),
      certificadoSenha,
    }),
    "utf8"
  );

  try {
    const { stderr } = await execFileAsync(process.execPath, [NFE_DISTRIBUICAO_WORKER_PATH, inputPath, outputPath], {
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
      throw new AcbrLibIntegrationError(result?.message || "Falha ao consultar XML por chave na ACBrLib.", {
        tenantId,
        chaveAcesso,
        workerResult: result,
      });
    }

    return result;
  } catch (error) {
    const result = await safeReadJsonFile(outputPath);
    const signal = error.signal ? ` (signal: ${error.signal})` : "";
    const stderr = String(error.stderr || "").trim();
    const message =
      result?.lastReturn ||
      result?.message ||
      stderr ||
      `A ACBrLib falhou durante a distribuição por chave${signal}.`;

    throw new AcbrLibIntegrationError(message, {
      tenantId,
      chaveAcesso,
      workerResult: result,
      signal: error.signal || null,
      stderr,
    });
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
};

const buildResponseMetadata = (rawText, operation) => {
  const parsed = parseIniLikeResponse(rawText);
  const cStat =
    findIniValue(parsed, ["CStat", "cStat", "Status"], [
      "Retorno",
      "ENVIO",
      "CONSULTA",
      "CANCELAMENTO",
    ]) || extractXmlTag(rawText, "cStat");
  const xMotivo =
    findIniValue(parsed, ["xMotivo", "Motivo", "Msg"], [
      "Retorno",
      "ENVIO",
      "CONSULTA",
      "CANCELAMENTO",
    ]) || extractXmlTag(rawText, "xMotivo");
  const recibo = findIniValue(parsed, ["Recibo", "nRec"]) || extractXmlTag(rawText, "nRec");
  const protocolo =
    findIniValue(parsed, ["Protocolo", "nProt"]) || extractXmlTag(rawText, "nProt");
  const chaveAcesso =
    findIniValue(parsed, ["chNFe", "Chave", "chDFe"]) || extractXmlTag(rawText, "chNFe");
  const numero = findIniValue(parsed, ["nNF", "Numero"]) || extractXmlTag(rawText, "nNF");

  return {
    operation,
    raw: rawText,
    parsed,
    cStat: cStat || null,
    xMotivo: xMotivo || null,
    recibo: recibo || null,
    protocolo: protocolo || null,
    chaveAcesso: chaveAcesso || null,
    numero: safeParseInteger(numero),
    mappedStatus: mapNfeReturnToStatus({ cStat, operation }),
  };
};

const extractDistributionMetadata = (rawText = "") => {
  const parsed = parseIniLikeResponse(rawText);
  const cStat = findIniValue(parsed, ["CStat", "cStat"], [
    "DistribuicaoDFe",
    "Retorno",
    "DFe",
    "Resposta",
  ]);
  const xMotivo = findIniValue(parsed, ["XMotivo", "xMotivo", "Motivo", "Msg"], [
    "DistribuicaoDFe",
    "Retorno",
    "DFe",
    "Resposta",
  ]);

  return {
    raw: rawText,
    parsed,
    cStat: cStat || null,
    xMotivo: xMotivo || null,
  };
};

const hasCompleteNfeXml = (xml) => {
  const text = String(xml || "");
  return /<(procNFe|NFe)\b/i.test(text) && /<det\b/i.test(text);
};

const shouldPersistMappedStatus = ({ operation, mappedStatus }) => {
  if (operation === "cancelar") {
    return mappedStatus === "cancelada";
  }

  if (operation === "consultar") {
    return ["autorizada", "cancelada", "denegada"].includes(mappedStatus);
  }

  return true;
};

const shouldSetIntegrationErrorStatus = ({ eventType, currentStatus }) => {
  if (eventType !== "emissao_retorno") return false;
  return !["autorizada", "cancelada", "denegada"].includes(
    String(currentStatus || "").toLowerCase()
  );
};

const persistSuccess = async (client, { context, userId, metadata, preXml, postXml, eventType }) => {
  await client.query("BEGIN");

  try {
    const nextStatus = shouldPersistMappedStatus({
      operation: metadata.operation,
      mappedStatus: metadata.mappedStatus,
    })
      ? metadata.mappedStatus
      : context.nfe.status;

    await AcbrNfeIntegrationDAO.atualizarNfe(client, context.nfe.nfe_id, {
      status: nextStatus,
      status_sefaz: metadata.cStat,
      recibo: metadata.recibo,
      protocolo: metadata.protocolo,
      chave_acesso: metadata.chaveAcesso || context.nfe.chave_acesso || null,
      numero: metadata.numero || context.nfe.numero,
    });

    await AcbrNfeIntegrationDAO.registrarEvento(client, {
      nfeId: context.nfe.nfe_id,
      usuarioId: userId,
      tipoEvento: eventType,
      status: metadata.mappedStatus === "autorizada" || metadata.mappedStatus === "cancelada" ? "sucesso" : "falha",
      mensagem: metadata.xMotivo || `Retorno da operação ${metadata.operation}.`,
      respostaJson: metadata,
    });

    await AcbrNfeIntegrationDAO.salvarXml(client, {
      nfeId: context.nfe.nfe_id,
      tipoXml: "pre_envio",
      chaveAcesso: metadata.chaveAcesso || context.nfe.chave_acesso || null,
      conteudoXml: preXml,
    });

    await AcbrNfeIntegrationDAO.salvarXml(client, {
      nfeId: context.nfe.nfe_id,
      tipoXml:
        metadata.operation === "cancelar"
          ? "cancelamento"
          : metadata.mappedStatus === "autorizada"
            ? "autorizado"
            : "retorno_autorizacao",
      chaveAcesso: metadata.chaveAcesso || context.nfe.chave_acesso || null,
      conteudoXml: postXml,
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
};

const persistFailure = async (client, { context, userId, eventType, error, responseText, preXml }) => {
  await client.query("BEGIN");

  try {
    if (
      shouldSetIntegrationErrorStatus({
        eventType,
        currentStatus: context.nfe.status,
      })
    ) {
      await AcbrNfeIntegrationDAO.atualizarNfe(client, context.nfe.nfe_id, {
        status: "erro_integracao",
        status_sefaz: null,
      });
    }

    await AcbrNfeIntegrationDAO.registrarEvento(client, {
      nfeId: context.nfe.nfe_id,
      usuarioId: userId,
      tipoEvento: eventType,
      status: "falha",
      mensagem: error.message || "Falha na integração com ACBrLib.",
      respostaJson: responseText ? { raw: responseText } : null,
    });

    await AcbrNfeIntegrationDAO.salvarXml(client, {
      nfeId: context.nfe.nfe_id,
      tipoXml: "pre_envio",
      chaveAcesso: context.nfe.chave_acesso || null,
      conteudoXml: preXml,
    });

    await client.query("COMMIT");
  } catch (persistError) {
    await client.query("ROLLBACK");
    throw persistError;
  }
};

class AcbrLibProvider {
  static ensureConfigured() {
    if (!isEnabled()) {
      throw new AcbrLibNotConfiguredError(
        "ACBrLib desativada. Configure ACBRLIB_ENABLED=true no .env da VPS e recrie o container v12-acbr."
      );
    }

    const diagnostics = getAcbrRuntimeDiagnostics();

    if (!diagnostics.libExists) {
      throw new AcbrLibNotConfiguredError(
        `Biblioteca ACBrLibNFE não encontrada em ${diagnostics.libPath}. Ajuste ACBRLIB_PATH no .env.`
      );
    }

    if (!diagnostics.schemaExists) {
      throw new AcbrLibNotConfiguredError(
        `Schemas da NF-e não encontrados em ${diagnostics.schemaDir}. Ajuste ACBRLIB_SCHEMA_PATH no .env.`
      );
    }
  }

  static async emitirNfe({ client, nfeId, tenantId, userId = null }) {
    this.ensureConfigured();

    await client.query("BEGIN");
    let context;

    try {
      await AcbrNfeIntegrationDAO.reservarNumero(client, nfeId);
      context = await AcbrNfeIntegrationDAO.carregarContexto(client, nfeId);
      AcbrNfeIntegrationDAO.validarContexto(context);

      await AcbrNfeIntegrationDAO.atualizarNfe(client, nfeId, {
        status: "processando",
      });

      await AcbrNfeIntegrationDAO.registrarEvento(client, {
        nfeId,
        usuarioId: userId,
        tipoEvento: "emissao_iniciada",
        status: "processando",
        mensagem: "Processo de emissão iniciado na ACBrLib.",
        payloadJson: { tenantId, numero: context.nfe.numero },
      });

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    let preXml = null;
    let lastReturn = null;

    try {
      logAcbrStep("worker:start", { tenantId, nfeId });
      const workerResult = await runNfeEmissionWorker({
        tenantId,
        nfeId,
        context,
        certificadoSenha: decryptSecret(context.certificado.senha_criptografada),
      });
      logAcbrStep("worker:done", { tenantId, nfeId });

      preXml = workerResult.preXml;
      const metadata = buildResponseMetadata(workerResult.rawResponse, "emitir");

      await persistSuccess(client, {
        context,
        userId,
        metadata,
        preXml,
        postXml: workerResult.postXml,
        eventType: "emissao_retorno",
      });

      return {
        success: metadata.mappedStatus === "autorizada",
        ...metadata,
      };
    } catch (error) {
      const workerResult = error.details?.workerResult || null;
      preXml = workerResult?.preXml || preXml;
      lastReturn = workerResult?.lastReturn || error.details?.stderr || null;

      await persistFailure(client, {
        context,
        userId,
        eventType: "emissao_retorno",
        error,
        responseText: lastReturn,
        preXml,
      });

      throw new AcbrLibIntegrationError(
        lastReturn || error.message || "Falha ao emitir NF-e com a ACBrLib.",
        { nfeId, tenantId, workerResult, signal: error.details?.signal || null }
      );
    }
  }

  static async gerarDanfePdf({ client, nfeId, tenantId }) {
    this.ensureConfigured();

    const context = await AcbrNfeIntegrationDAO.carregarContexto(client, nfeId);

    if (String(context.nfe.status || "").toLowerCase() !== "autorizada") {
      throw new AcbrLibIntegrationError("DANFE disponível apenas para NF-e autorizada.", {
        nfeId,
        tenantId,
      });
    }

    const assets = await AcbrNfeIntegrationDAO.carregarDanfeAssets(client, nfeId);
    if (!assets.xml?.conteudo_xml) {
      throw new AcbrLibIntegrationError("A NF-e autorizada ainda não possui XML salvo.", {
        nfeId,
        tenantId,
      });
    }

    const workerResult = await runDanfeWorker({
      tenantId,
      nfeId,
      context,
      certificadoSenha: context.certificado?.senha_criptografada
        ? decryptSecret(context.certificado.senha_criptografada)
        : "",
      xmlAutorizado: assets.xml.conteudo_xml,
      logo: assets.logo,
    });

    return {
      filename: `danfe-nfe-${context.nfe.numero || nfeId}.pdf`,
      buffer: workerResult.pdfBuffer,
      pdfPath: workerResult.pdfPath,
    };
  }

  static async distribuirNfePorChave({ client, tenantId, chaveAcesso }) {
    this.ensureConfigured();

    const context = await AcbrNfeIntegrationDAO.carregarContextoDistribuicao(client);
    const uf = String(context.uf || "").trim().toUpperCase();
    const cufAutor = getCufByUf(uf);

    if (!cufAutor) {
      throw new AcbrLibIntegrationError("UF da filial inválida para consulta da NF-e por chave.", {
        tenantId,
        uf,
      });
    }

    const workerResult = await runDistribuicaoWorker({
      tenantId,
      chaveAcesso,
      cufAutor,
      cnpjCpfAutor: context.cnpjCpf,
      uf,
      ambiente: context.ambiente,
      certificadoBuffer: context.certificado.conteudo_pfx,
      certificadoSenha: decryptSecret(context.certificado.senha_criptografada),
    });
    const metadata = extractDistributionMetadata(workerResult.rawResponse);
    const xml = workerResult.xml || "";

    return {
      ...metadata,
      xml,
      xmlCompleto: hasCompleteNfeXml(xml),
      paths: workerResult.paths || null,
    };
  }

  static async consultarStatus({ client, nfeId, tenantId, userId = null }) {
    this.ensureConfigured();

    const context = await AcbrNfeIntegrationDAO.carregarContexto(client, nfeId);
    AcbrNfeIntegrationDAO.validarContexto(context);

    if (!context.nfe.chave_acesso) {
      throw new AcbrLibIntegrationError("A NF-e ainda não possui chave de acesso para consulta.", {
        nfeId,
        tenantId,
      });
    }

    const session = await createAcbrSession({
      tenantId,
      nfeId,
      certificadoBuffer: context.certificado.conteudo_pfx,
      certificadoSenha: decryptSecret(context.certificado.senha_criptografada),
    });

    try {
      await configureAcbrSession(session, context);
      const rawResponse = session.acbr.consultar(context.nfe.chave_acesso, true);
      const metadata = buildResponseMetadata(rawResponse, "consultar");

      await persistSuccess(client, {
        context,
        userId,
        metadata,
        preXml: null,
        postXml: null,
        eventType: "consulta_status_retorno",
      });

      return metadata;
    } catch (error) {
      const lastReturn = session.acbr?.ultimoRetorno?.() || null;

      await persistFailure(client, {
        context,
        userId,
        eventType: "consulta_status_retorno",
        error,
        responseText: lastReturn,
        preXml: null,
      });

      throw new AcbrLibIntegrationError(
        lastReturn || error.message || "Falha ao consultar o status da NF-e.",
        { nfeId, tenantId }
      );
    } finally {
      await destroyAcbrSession(session);
    }
  }

  static async cancelarNfe({ client, nfeId, tenantId, justificativa, userId = null }) {
    this.ensureConfigured();

    const context = await AcbrNfeIntegrationDAO.carregarContexto(client, nfeId);
    AcbrNfeIntegrationDAO.validarContexto(context);

    if (!context.nfe.chave_acesso) {
      throw new AcbrLibIntegrationError("A NF-e ainda não possui chave de acesso para cancelamento.", {
        nfeId,
        tenantId,
      });
    }

    if (!String(justificativa || "").trim()) {
      throw new AcbrLibIntegrationError("Informe a justificativa do cancelamento.", {
        nfeId,
        tenantId,
      });
    }

    const session = await createAcbrSession({
      tenantId,
      nfeId,
      certificadoBuffer: context.certificado.conteudo_pfx,
      certificadoSenha: decryptSecret(context.certificado.senha_criptografada),
    });

    try {
      await configureAcbrSession(session, context);
      const rawResponse = session.acbr.cancelar(
        context.nfe.chave_acesso,
        justificativa,
        context.emitente.cpf_cnpj.replace(/\D/g, ""),
        1
      );
      const metadata = buildResponseMetadata(rawResponse, "cancelar");

      await persistSuccess(client, {
        context,
        userId,
        metadata,
        preXml: null,
        postXml: null,
        eventType: "cancelamento_retorno",
      });

      return metadata;
    } catch (error) {
      const lastReturn = session.acbr?.ultimoRetorno?.() || null;

      await persistFailure(client, {
        context,
        userId,
        eventType: "cancelamento_retorno",
        error,
        responseText: lastReturn,
        preXml: null,
      });

      throw new AcbrLibIntegrationError(
        lastReturn || error.message || "Falha ao cancelar a NF-e.",
        { nfeId, tenantId }
      );
    } finally {
      await destroyAcbrSession(session);
    }
  }
}

export { AcbrLibProvider, AcbrLibNotConfiguredError, AcbrLibIntegrationError };
