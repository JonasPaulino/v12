import fs from "fs/promises";
import path from "path";
import {
  configureMdfeEmissionSession,
  createMdfeEmissionSession,
  destroyMdfeSession,
} from "./mdfeRuntime.js";

const [, , inputPath, outputPath] = process.argv;

const writeOutput = async (payload) => {
  if (!outputPath) return;
  await fs.writeFile(outputPath, JSON.stringify(payload), "utf8");
};

const logStep = (step, details = {}) => {
  console.error("[acbr:damdfe:worker]", { step, ...details });
};

const pdfBufferFromBase64 = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  try {
    const buffer = Buffer.from(raw, "base64");
    return buffer.subarray(0, 4).toString("utf8") === "%PDF" ? buffer : null;
  } catch {
    return null;
  }
};

const readGeneratedPdf = async ({ pdfResponse, pdfDir }) => {
  const directPdf = pdfBufferFromBase64(pdfResponse);
  if (directPdf) {
    return {
      path: null,
      buffer: directPdf,
    };
  }

  const candidates = [];
  if (pdfResponse) candidates.push(pdfResponse);

  try {
    const entries = await fs.readdir(pdfDir, { withFileTypes: true });
    const pdfFiles = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
      .map((entry) => path.join(pdfDir, entry.name));

    candidates.push(...pdfFiles);
  } catch {}

  let newest = null;
  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (!newest || stat.mtimeMs > newest.stat.mtimeMs) {
        newest = { path: candidate, stat };
      }
    } catch {}
  }

  if (!newest) {
    throw new Error("A ACBrLibMDFe não retornou ou salvou o PDF do DAMDFE.");
  }

  return {
    path: newest.path,
    buffer: await fs.readFile(newest.path),
  };
};

const run = async () => {
  const rawInput = await fs.readFile(inputPath, "utf8");
  const payload = JSON.parse(rawInput);
  const {
    tenantId,
    mdfeId,
    context,
    certificadoBase64,
    certificadoSenha,
    xmlAutorizado,
  } = payload;

  const session = await createMdfeEmissionSession({
    tenantId,
    mdfeId,
    certificadoBuffer: certificadoBase64 ? Buffer.from(certificadoBase64, "base64") : null,
    certificadoSenha,
  });

  try {
    logStep("configure:start", { tenantId, mdfeId });
    await configureMdfeEmissionSession(session, context);
    session.acbr.configGravarValor("DAMDFE", "PathPDF", session.pdfDir);
    session.acbr.configGravar();
    logStep("configure:done", { tenantId, mdfeId, configPath: session.configPath });

    const xmlPath = path.join(session.rootDir, "mdfe-autorizado.xml");
    await fs.writeFile(xmlPath, xmlAutorizado, "utf8");
    logStep("xml:written", { tenantId, mdfeId, xmlPath });

    session.acbr.limparLista();
    session.acbr.carregarXML(xmlPath);
    logStep("xml:loaded", { tenantId, mdfeId });

    const pdfResponse = session.acbr.salvarPDF();
    logStep("pdf:saved", { tenantId, mdfeId, returned: !!pdfResponse });

    const pdf = await readGeneratedPdf({ pdfResponse, pdfDir: session.pdfDir });

    await writeOutput({
      ok: true,
      pdfBase64: pdf.buffer.toString("base64"),
      pdfPath: pdf.path,
      paths: {
        configPath: session.configPath,
        rootDir: session.rootDir,
        pdfDir: session.pdfDir,
        logDir: session.logDir,
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
      message: error.message || "Falha ao gerar DAMDFE com a ACBrLibMDFe.",
      lastReturn,
      paths: {
        configPath: session.configPath,
        rootDir: session.rootDir,
        pdfDir: session.pdfDir,
        logDir: session.logDir,
      },
    });

    throw error;
  } finally {
    await destroyMdfeSession(session);
  }
};

run().catch((error) => {
  console.error("[acbr:damdfe:worker] Falha", error);
  process.exitCode = 1;
});
