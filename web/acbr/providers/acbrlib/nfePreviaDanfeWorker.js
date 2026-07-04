import fs from "fs/promises";
import path from "path";
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
  console.error("[acbr:nfe-previa:worker]", { step, ...details });
};

const normalizeExtension = (mimeType = "", fileName = "") => {
  const lowerMime = String(mimeType || "").toLowerCase();
  const ext = path.extname(String(fileName || "")).toLowerCase();

  if ([".png", ".jpg", ".jpeg", ".bmp"].includes(ext)) return ext;
  if (lowerMime.includes("png")) return ".png";
  if (lowerMime.includes("jpeg") || lowerMime.includes("jpg")) return ".jpg";
  if (lowerMime.includes("bmp")) return ".bmp";
  return "";
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

const readGeneratedPdf = async ({ pdfPath, pdfDir }) => {
  const candidates = [];
  const directPdf = pdfBufferFromBase64(pdfPath);

  if (directPdf) {
    return {
      path: null,
      buffer: directPdf,
    };
  }

  if (pdfPath) {
    candidates.push(pdfPath);
  }

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
    throw new Error("A ACBrLib não retornou ou salvou o PDF da prévia.");
  }

  return {
    path: newest.path,
    buffer: await fs.readFile(newest.path),
  };
};

const safeGetXml = (acbr) => {
  try {
    return acbr.obterXml(0);
  } catch {
    return null;
  }
};

const salvarPdf = async ({ session, preXml }) => {
  try {
    return session.acbr.salvarPDF();
  } catch (error) {
    if (!preXml) throw error;

    const xmlPath = path.join(session.rootDir, "nfe-previa.xml");
    await fs.writeFile(xmlPath, preXml, "utf8");
    session.acbr.limparLista();
    session.acbr.carregarXML(xmlPath);
    return session.acbr.salvarPDF();
  }
};

const run = async () => {
  const rawInput = await fs.readFile(inputPath, "utf8");
  const payload = JSON.parse(rawInput);
  const {
    tenantId,
    nfeId,
    context,
    certificadoBase64,
    certificadoSenha,
    logoBase64,
    logoMimeType,
    logoNomeArquivo,
  } = payload;

  const session = await createAcbrSession({
    tenantId,
    nfeId,
    certificadoBuffer: certificadoBase64 ? Buffer.from(certificadoBase64, "base64") : null,
    certificadoSenha,
  });

  let preXml = null;

  try {
    logStep("configure:start", { tenantId, nfeId });
    await configureAcbrSession(session, context);
    session.acbr.configGravarValor("DANFE", "TipoDANFE", "0");

    const logoExtension = normalizeExtension(logoMimeType, logoNomeArquivo);
    if (logoBase64 && logoExtension) {
      const logoPath = path.join(session.rootDir, `logo${logoExtension}`);
      await fs.writeFile(logoPath, Buffer.from(logoBase64, "base64"));
      session.acbr.configGravarValor("DANFE", "PathLogo", logoPath);
    }

    session.acbr.configGravar();
    logStep("configure:done", { tenantId, nfeId, configPath: session.configPath });

    const iniContent = buildNfeIni(context);
    const iniPath = await writeAcbrIni(session, iniContent);
    logStep("ini:written", { tenantId, nfeId, iniPath });

    session.acbr.limparLista();
    session.acbr.carregarINI(iniPath);
    preXml = safeGetXml(session.acbr);
    logStep("nfe:loaded", { tenantId, nfeId, hasXml: !!preXml });

    const pdfPath = await salvarPdf({ session, preXml });
    const pdf = await readGeneratedPdf({ pdfPath, pdfDir: session.pdfDir });

    await writeOutput({
      ok: true,
      pdfBase64: pdf.buffer.toString("base64"),
      pdfPath: pdf.path,
      preXml,
      paths: {
        configPath: session.configPath,
        iniPath,
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
      message: error.message || "Falha ao gerar prévia da NF-e com a ACBrLib.",
      lastReturn,
      preXml,
      paths: {
        configPath: session.configPath,
        rootDir: session.rootDir,
        pdfDir: session.pdfDir,
        logDir: session.logDir,
      },
    });

    throw error;
  } finally {
    await destroyAcbrSession(session);
  }
};

run().catch((error) => {
  console.error("[acbr:nfe-previa:worker] Falha", error);
  process.exitCode = 1;
});
