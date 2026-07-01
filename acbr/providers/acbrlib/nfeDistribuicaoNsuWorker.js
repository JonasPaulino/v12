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

const writeOutput = async (payload) => {
  if (!outputPath) return;
  await fs.writeFile(outputPath, JSON.stringify(payload), "utf8");
};

const logStep = (step, details = {}) => {
  console.error("[acbr:nfe:distribuicao-nsu:worker]", { step, ...details });
};

const validateCertificateFile = async ({ certPath, certificadoSenha }) => {
  const tempPem = path.join(os.tmpdir(), `v12-dist-nsu-cert-${process.pid}-${Date.now()}.pem`);
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

const listXmlFiles = async (dir) => {
  let entries = [];

  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return listXmlFiles(fullPath);
      return entry.isFile() && entry.name.toLowerCase().endsWith(".xml") ? [fullPath] : [];
    })
  );

  return files.flat();
};

const collectXmlDocuments = async (xmlDir) => {
  const files = await listXmlFiles(xmlDir);
  const docs = [];

  for (const filePath of files.sort()) {
    const xml = await fs.readFile(filePath, "utf8");
    if (/<(procNFe|NFe|resNFe|procEventoNFe|resEvento)\b/i.test(xml)) {
      docs.push({
        fileName: path.basename(filePath),
        xml: xml.trim(),
      });
    }
  }

  return docs;
};

const collectXmlDocumentsFromRaw = (rawResponse) => {
  const docs = [];
  const text = String(rawResponse || "");
  const regex = /^XML=(.+)$/gim;
  let match = regex.exec(text);

  while (match) {
    const xml = String(match[1] || "").trim();
    if (/<(procNFe|NFe|resNFe|procEventoNFe|resEvento)\b/i.test(xml)) {
      docs.push({
        fileName: `raw-${String(docs.length + 1).padStart(3, "0")}.xml`,
        xml,
      });
    }
    match = regex.exec(text);
  }

  return docs;
};

const extractIniValue = (text, key) => {
  const match = String(text || "").match(new RegExp(`(?:^|\\n)\\s*${key}\\s*=\\s*([^\\r\\n]+)`, "i"));
  return match?.[1]?.trim() || "";
};

const previewRaw = (value, maxLength = 800) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const distribuicaoDFePorUltNsu = (acbr, cufAutor, cnpjCpfAutor, ultNsu) => {
  const acbrBuffer = new ACBrBuffer(TAMANHO_PADRAO);

  try {
    const status = acbr.LIB_DistribuicaoDFePorUltNSU(
      acbr.getHandle(),
      Number(cufAutor),
      String(cnpjCpfAutor || ""),
      String(ultNsu || "000000000000000"),
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
    cufAutor,
    cnpjCpfAutor,
    uf,
    ambiente,
    ultNsu,
    certificadoBase64,
    certificadoSenha,
  } = payload;

  const scopeKey = `tenant-${tenantId}-dist-nsu-${Date.now()}`;
  const session = await createAcbrLookupSession({
    scopeKey,
    certificadoBuffer: Buffer.from(certificadoBase64, "base64"),
    certificadoSenha,
  });

  try {
    logStep("certificado:validar:start", { tenantId, ultNsu });
    await validateCertificateFile({ certPath: session.certPath, certificadoSenha });
    logStep("certificado:validar:done", { tenantId, ultNsu });

    logStep("configure:start", { tenantId, uf, ambiente });
    await configureAcbrLookupSession(session, { uf, ambiente });
    logStep("configure:done", { tenantId, configPath: session.configPath });

    logStep("distribuicao:start", { tenantId, cufAutor, ultNsu });
    const rawResponse = distribuicaoDFePorUltNsu(session.acbr, cufAutor, cnpjCpfAutor, ultNsu);
    const rawDocs = collectXmlDocumentsFromRaw(rawResponse);
    const fileDocs = await collectXmlDocuments(session.xmlDir);
    const documentos = [
      ...rawDocs,
      ...fileDocs,
    ];
    logStep("distribuicao:done", {
      tenantId,
      documentos: documentos.length,
      rawDocs: rawDocs.length,
      fileDocs: fileDocs.length,
      cStat: extractIniValue(rawResponse, "CStat"),
      xMotivo: extractIniValue(rawResponse, "XMotivo") || extractIniValue(rawResponse, "xMotivo"),
      ultNsuRetorno: extractIniValue(rawResponse, "ultNSU") || extractIniValue(rawResponse, "UltNSU"),
      maxNsuRetorno: extractIniValue(rawResponse, "maxNSU") || extractIniValue(rawResponse, "MaxNSU"),
      rawPreview: previewRaw(rawResponse),
      paths: {
        configPath: session.configPath,
        logDir: session.logDir,
        rootDir: session.rootDir,
      },
    });

    await writeOutput({
      ok: true,
      rawResponse,
      documentos,
      paths: {
        configPath: session.configPath,
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
      message: error.message || "Falha na distribuição DFe por NSU.",
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
  console.error("[acbr:nfe:distribuicao-nsu:worker] Falha", error);
  process.exitCode = 1;
});
