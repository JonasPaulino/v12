import fs from "fs/promises";
import {
  configureAcbrSession,
  createAcbrSession,
  destroyAcbrSession,
  writeAcbrIni,
} from "./runtime.js";
import { buildNfeIni } from "./iniBuilder.js";

const [, , inputPath, outputPath] = process.argv;

const writeOutput = async (payload) => {
  if (!outputPath) return;
  await fs.writeFile(outputPath, JSON.stringify(payload), "utf8");
};

const logStep = (step, details = {}) => {
  console.error("[acbr:nfe:worker]", { step, ...details });
};

const safeGetXml = (acbr) => {
  try {
    return acbr.obterXml(0);
  } catch {
    return null;
  }
};

const run = async () => {
  const rawInput = await fs.readFile(inputPath, "utf8");
  const payload = JSON.parse(rawInput);
  const { tenantId, nfeId, context, certificadoBase64, certificadoSenha } = payload;

  const session = await createAcbrSession({
    tenantId,
    nfeId,
    certificadoBuffer: Buffer.from(certificadoBase64, "base64"),
    certificadoSenha,
  });

  let preXml = null;

  try {
    logStep("configure:start", { tenantId, nfeId });
    await configureAcbrSession(session, context);
    logStep("configure:done", { tenantId, nfeId, configPath: session.configPath });

    const iniContent = buildNfeIni(context);
    const iniPath = await writeAcbrIni(session, iniContent);
    logStep("ini:written", { tenantId, nfeId, iniPath });

    logStep("limparLista:start", { tenantId, nfeId });
    session.acbr.limparLista();
    logStep("limparLista:done", { tenantId, nfeId });

    logStep("carregarINI:start", { tenantId, nfeId, iniPath });
    session.acbr.carregarINI(iniPath);
    logStep("carregarINI:done", { tenantId, nfeId });

    logStep("obterXml:pre:start", { tenantId, nfeId });
    preXml = safeGetXml(session.acbr);
    logStep("obterXml:pre:done", { tenantId, nfeId, hasXml: !!preXml });

    await writeOutput({
      ok: false,
      stage: "before_assinar",
      preXml,
      paths: {
        configPath: session.configPath,
        iniPath,
        logDir: session.logDir,
        rootDir: session.rootDir,
      },
    });

    logStep("assinar:start", { tenantId, nfeId });
    session.acbr.assinar();
    logStep("assinar:done", { tenantId, nfeId });

    logStep("validar:start", { tenantId, nfeId });
    session.acbr.validar();
    logStep("validar:done", { tenantId, nfeId });

    logStep("enviar:start", { tenantId, nfeId, lote: 1 });
    const rawResponse = session.acbr.enviar(1, false, true, false);
    logStep("enviar:done", { tenantId, nfeId });

    logStep("obterXml:post:start", { tenantId, nfeId });
    const postXml = safeGetXml(session.acbr);
    logStep("obterXml:post:done", { tenantId, nfeId, hasXml: !!postXml });

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
      message: error.message || "Falha na ACBrLib.",
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
    await destroyAcbrSession(session);
  }
};

run().catch((error) => {
  console.error("[acbr:nfe:worker] Falha", error);
  process.exitCode = 1;
});
