import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import {
  configureMdfeEmissionSession,
  createMdfeEmissionSession,
  destroyMdfeSession,
  writeMdfeIni,
} from "./mdfeRuntime.js";
import { buildMdfeIni } from "./mdfeIniBuilder.js";

const [, , inputPath, outputPath] = process.argv;
const execFileAsync = promisify(execFile);

const writeOutput = async (payload) => {
  if (!outputPath) return;
  await fs.writeFile(outputPath, JSON.stringify(payload), "utf8");
};

const logStep = (step, details = {}) => {
  console.error("[acbr:mdfe:worker]", { step, ...details });
};

const safeGetXml = (acbr) => {
  try {
    return acbr.obterXml(0);
  } catch {
    return null;
  }
};

const validateCertificateFile = async ({ certPath, certificadoSenha }) => {
  const tempPem = path.join(os.tmpdir(), `v12-mdfe-cert-${process.pid}-${Date.now()}.pem`);

  try {
    await execFileAsync(
      "openssl",
      [
        "pkcs12",
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
  } catch (error) {
    const stderr = String(error.stderr || "").trim();
    if (/invalid password|mac verify error/i.test(stderr)) {
      throw new Error("Senha do certificado A1 inválida ou certificado incompatível.");
    }

    throw new Error(stderr || error.message || "Não foi possível validar o certificado A1.");
  } finally {
    await fs.rm(tempPem, { force: true });
  }
};

const run = async () => {
  const rawInput = await fs.readFile(inputPath, "utf8");
  const payload = JSON.parse(rawInput);
  const { tenantId, mdfeId, context, certificadoBase64, certificadoSenha } = payload;

  const session = await createMdfeEmissionSession({
    tenantId,
    mdfeId,
    certificadoBuffer: Buffer.from(certificadoBase64, "base64"),
    certificadoSenha,
  });

  let preXml = null;

  try {
    logStep("certificado:validar:start", { tenantId, mdfeId });
    await validateCertificateFile({ certPath: session.certPath, certificadoSenha });
    logStep("certificado:validar:done", { tenantId, mdfeId });

    logStep("configure:start", { tenantId, mdfeId });
    await configureMdfeEmissionSession(session, context);
    logStep("configure:done", { tenantId, mdfeId, configPath: session.configPath });

    const iniContent = buildMdfeIni(context);
    const iniPath = await writeMdfeIni(session, iniContent);
    logStep("ini:written", { tenantId, mdfeId, iniPath });

    logStep("limparLista:start", { tenantId, mdfeId });
    session.acbr.limparLista();
    logStep("limparLista:done", { tenantId, mdfeId });

    logStep("carregarINI:start", { tenantId, mdfeId, iniPath });
    session.acbr.carregarINI(iniPath);
    logStep("carregarINI:done", { tenantId, mdfeId });

    logStep("obterXml:pre:start", { tenantId, mdfeId });
    preXml = safeGetXml(session.acbr);
    logStep("obterXml:pre:done", { tenantId, mdfeId, hasXml: !!preXml });

    logStep("assinar:start", { tenantId, mdfeId });
    session.acbr.assinar();
    logStep("assinar:done", { tenantId, mdfeId });

    logStep("validar:start", { tenantId, mdfeId });
    session.acbr.validar();
    logStep("validar:done", { tenantId, mdfeId });

    logStep("enviar:start", { tenantId, mdfeId, lote: 1 });
    const rawResponse = session.acbr.enviar(1, false, true);
    logStep("enviar:done", { tenantId, mdfeId });

    logStep("obterXml:post:start", { tenantId, mdfeId });
    const postXml = safeGetXml(session.acbr);
    logStep("obterXml:post:done", { tenantId, mdfeId, hasXml: !!postXml });

    await writeOutput({
      ok: true,
      stage: "done",
      rawResponse,
      preXml,
      postXml,
      paths: {
        configPath: session.configPath,
        iniPath,
        logDir: session.logDir,
        rootDir: session.rootDir,
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
      stage: "error",
      message: error.message || "Falha na ACBrLibMDFe.",
      lastReturn,
      preXml,
      paths: {
        configPath: session.configPath,
        iniPath: session.iniPath,
        logDir: session.logDir,
        rootDir: session.rootDir,
      },
    });

    throw error;
  } finally {
    await destroyMdfeSession(session);
  }
};

run().catch((error) => {
  console.error("[acbr:mdfe:worker] Falha", error);
  process.exitCode = 1;
});
