import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import ACBrBufferModule from "@projetoacbr/acbrlib-base-node/dist/src/ACBrBuffer/index.js";
import {
  configureAcbrLookupSession,
  createAcbrLookupSession,
  destroyAcbrSession,
} from "./runtime.js";

const [, , inputPath, outputPath] = process.argv;
const execFileAsync = promisify(execFile);
const ACBrBuffer = ACBrBufferModule.default || ACBrBufferModule;
const TAMANHO_PADRAO = ACBrBufferModule.TAMANHO_PADRAO || 1024;

const EVENT_MAP = {
  confirmacao_operacao: "210200",
  ciencia_operacao: "210210",
  desconhecimento_operacao: "210220",
  operacao_nao_realizada: "210240",
};

const writeOutput = async (payload) => {
  if (!outputPath) return;
  await fs.writeFile(outputPath, JSON.stringify(payload), "utf8");
};

const logStep = (step, details = {}) => {
  console.error("[acbr:nfe:manifestacao:worker]", { step, ...details });
};

const validateCertificateFile = async ({ certPath, certificadoSenha }) => {
  const tempPem = path.join(os.tmpdir(), `v12-manif-cert-${process.pid}-${Date.now()}.pem`);
  const runExtract = (legacy = false) =>
    execFileAsync(
      "openssl",
      [
        "pkcs12",
        ...(legacy ? ["-legacy"] : []),
        "-in",
        certPath,
        "-nokeys",
        "-clcerts",
        "-passin",
        `pass:${certificadoSenha || ""}`,
        "-out",
        tempPem,
      ],
      {
        maxBuffer: 1024 * 1024,
        timeout: 30000,
      }
    );

  try {
    await runExtract();
  } catch (error) {
    const stderr = String(error.stderr || "").trim();
    if (/invalid password|mac verify error/i.test(stderr)) {
      throw new Error("Senha do certificado A1 inválida ou certificado incompatível.");
    }

    if (/unsupported|RC2|inner_evp_generic_fetch|digital envelope routines/i.test(stderr)) {
      await fs.rm(tempPem, { force: true }).catch(() => {});
      await runExtract(true);
      return;
    }

    throw new Error(stderr || error.message || "Não foi possível validar o certificado A1.");
  } finally {
    await fs.rm(tempPem, { force: true }).catch(() => {});
  }
};

const formatDhEvento = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMinutes);
  const offset = `${sign}${pad(Math.floor(absOffset / 60))}:${pad(absOffset % 60)}`;

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}${offset}`;
};

const buildEventoIni = ({
  chaveAcesso,
  documento,
  tipoEvento,
  justificativa,
  cOrgao = "91",
}) => {
  const codigoEvento = EVENT_MAP[tipoEvento];
  if (!codigoEvento) throw new Error("Tipo de manifestação inválido.");

  const cleanDocumento = String(documento || "").replace(/\D/g, "");
  const docKey = cleanDocumento.length === 11 ? "CPF" : "CNPJ";

  return [
    "[EVENTO]",
    "idLote=1",
    "",
    "[EVENTO001]",
    `cOrgao=${cOrgao}`,
    `${docKey}=${cleanDocumento}`,
    `chNFe=${chaveAcesso}`,
    `dhEvento=${formatDhEvento()}`,
    `tpEvento=${codigoEvento}`,
    "nSeqEvento=1",
    "versaoEvento=1.00",
    justificativa ? `xJust=${String(justificativa).trim()}` : "",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
};

const carregarEventoIni = async (acbr, iniPath) => {
  const status = acbr.LIB_CarregarEventoINI(acbr.getHandle(), iniPath);
  acbr._checkResult(status);
};

const enviarEvento = (acbr) => {
  const acbrBuffer = new ACBrBuffer(TAMANHO_PADRAO);

  try {
    const status = acbr.LIB_EnviarEvento(
      acbr.getHandle(),
      1,
      acbrBuffer.getBuffer(),
      acbrBuffer.getRefTamanhoBuffer()
    );

    acbr._checkResult(status);
    return acbr._processaResult(acbrBuffer);
  } finally {
    acbrBuffer.destroy?.();
  }
};

const run = async () => {
  const rawInput = await fs.readFile(inputPath, "utf8");
  const payload = JSON.parse(rawInput);
  const {
    tenantId,
    chaveAcesso,
    tipoEvento,
    justificativa,
    cufAutor,
    documento,
    uf,
    ambiente,
    certificadoBase64,
    certificadoSenha,
  } = payload;

  const scopeKey = `tenant-${tenantId}-manif-${chaveAcesso}`;
  const session = await createAcbrLookupSession({
    scopeKey,
    certificadoBuffer: Buffer.from(certificadoBase64, "base64"),
    certificadoSenha,
  });

  try {
    logStep("certificado:validar:start", { tenantId, chaveAcesso });
    await validateCertificateFile({ certPath: session.certPath, certificadoSenha });
    logStep("certificado:validar:done", { tenantId, chaveAcesso });

    logStep("configure:start", { tenantId, uf, ambiente });
    await configureAcbrLookupSession(session, { uf, ambiente });
    logStep("configure:done", { tenantId, configPath: session.configPath });

    const eventoIni = buildEventoIni({
      chaveAcesso,
      documento,
      tipoEvento,
      justificativa,
      cOrgao: "91",
    });
    const eventoPath = path.join(session.rootDir, "manifestacao.ini");
    await fs.writeFile(eventoPath, eventoIni, "utf8");

    logStep("evento:carregar:start", { tenantId, chaveAcesso, tipoEvento });
    await carregarEventoIni(session.acbr, eventoPath);
    logStep("evento:carregar:done", { tenantId, chaveAcesso });

    logStep("evento:enviar:start", { tenantId, chaveAcesso });
    const rawResponse = enviarEvento(session.acbr);
    logStep("evento:enviar:done", { tenantId, chaveAcesso });

    await writeOutput({
      ok: true,
      rawResponse,
      eventoIni,
      paths: {
        configPath: session.configPath,
        logDir: session.logDir,
        rootDir: session.rootDir,
        eventoPath,
      },
    });
  } catch (error) {
    let lastReturn = null;
    try {
      lastReturn = session.acbr?.ultimoRetorno?.() || null;
    } catch {
      lastReturn = null;
    }

    await writeOutput({
      ok: false,
      message: error.message || "Falha ao enviar manifestação da NF-e.",
      lastReturn,
      paths: {
        configPath: session.configPath,
        logDir: session.logDir,
        rootDir: session.rootDir,
      },
    });

    throw error;
  } finally {
    await destroyAcbrSession(session);
  }
};

run().catch((error) => {
  console.error("[acbr:nfe:manifestacao:worker] Falha", error);
  process.exitCode = 1;
});
