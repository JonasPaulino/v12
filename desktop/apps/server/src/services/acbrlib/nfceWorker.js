import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { buildNfceIni } from "./nfceIniBuilder.js";
import { createAcbrSession, destroyAcbrSession, writeAcbrIni } from "./runtime.js";

const execFileAsync = promisify(execFile);
const [, , inputPath, outputPath] = process.argv;

async function writeOutput(payload) {
  if (!outputPath) return;
  await fs.writeFile(outputPath, JSON.stringify(payload), "utf8");
}

function safeGetXml(acbr) {
  try {
    return acbr.obterXml(0);
  } catch {
    return null;
  }
}

async function hasOpenSsl() {
  try {
    await execFileAsync("openssl", ["version"], { timeout: 10000, maxBuffer: 1024 * 256 });
    return true;
  } catch {
    return false;
  }
}

async function validateCertificateFile({ certPath, certificadoSenha }) {
  if (!(await hasOpenSsl())) {
    return;
  }

  const tempPem = path.join(os.tmpdir(), `v12-pdv-cert-${process.pid}-${Date.now()}.pem`);
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
      { maxBuffer: 1024 * 1024, timeout: 30000 },
    );

  try {
    await runExtract();
  } catch (error) {
    const stderr = String(error.stderr || "").trim();
    if (/invalid password|mac verify error/i.test(stderr)) {
      throw new Error("Senha do certificado A1 inválida ou certificado incompatível.");
    }

    if (/unsupported|RC2|inner_evp_generic_fetch|digital envelope routines/i.test(stderr)) {
      try {
        await fs.rm(tempPem, { force: true }).catch(() => {});
        await runExtract(true);
        return;
      } catch (legacyError) {
        const legacyStderr = String(legacyError.stderr || "").trim();
        if (/invalid password|mac verify error/i.test(legacyStderr)) {
          throw new Error("Senha do certificado A1 inválida ou certificado incompatível.");
        }
        throw new Error(legacyStderr || "Não foi possível validar o certificado A1.");
      }
    }

    throw new Error(stderr || error.message || "Não foi possível validar o certificado A1.");
  } finally {
    await fs.rm(tempPem, { force: true }).catch(() => {});
  }
}

async function tryGeneratePdf(session) {
  try {
    if (typeof session.acbr.imprimirPDF === "function") {
      session.acbr.imprimirPDF();
    } else {
      return null;
    }

    const files = await fs.readdir(session.pdfDir).catch(() => []);
    const pdfFiles = files.filter((file) => file.toLowerCase().endsWith(".pdf")).sort();
    return pdfFiles.length ? path.join(session.pdfDir, pdfFiles[pdfFiles.length - 1]) : null;
  } catch {
    return null;
  }
}

async function writeXmlArtifact(session, filename, xmlContent) {
  const targetPath = path.join(session.xmlDir, filename);
  await fs.writeFile(targetPath, xmlContent, "utf8");
  return targetPath;
}

async function tryGeneratePdfFromXml(session, xmlContent) {
  const xmlPath = await writeXmlArtifact(session, "nfce.xml", xmlContent);
  try {
    session.acbr.limparLista();
    session.acbr.carregarXML(xmlPath);
  } catch {
    // segue para tentar gerar PDF do contexto já carregado
  }
  return tryGeneratePdf(session);
}

function extractAccessKeyFromXml(xmlContent) {
  const match = String(xmlContent || "").match(/<infNFe[^>]+Id="NFe(\d{44})"/i);
  return match?.[1] || null;
}

async function run() {
  const rawInput = await fs.readFile(inputPath, "utf8");
  const payload = JSON.parse(rawInput);
  const {
    tenantId,
    vendaId,
    context,
    certificadoBase64,
    certificadoSenha,
    operation = "emitir_normal",
    formaEmissao = "0",
    xmlContent = null,
  } = payload;

  const session = await createAcbrSession({
    tenantId,
    vendaId,
    certificadoBuffer: Buffer.from(certificadoBase64, "base64"),
    certificadoSenha,
    ambiente: context.nfce.ambiente,
    emitenteUf: context.emitente.uf,
    formaEmissao,
  });

  try {
    await validateCertificateFile({ certPath: session.certPath, certificadoSenha });

    session.acbr.configGravarValor("NFE", "IdCSC", String(context.configuracao.nfce_id_token_csc || ""));
    session.acbr.configGravarValor("NFE", "CSC", String(context.configuracao.nfce_csc || ""));
    session.acbr.configGravar(session.configPath);

    let iniPath = null;
    let preXml = null;
    let postXml = null;
    let rawResponse = null;
    let pdfPath = null;
    let chaveAcesso = null;

    if (operation === "transmitir_xml_contingencia") {
      const xmlPath = await writeXmlArtifact(session, "nfce-contingencia.xml", xmlContent || "");
      session.acbr.limparLista();
      session.acbr.carregarXML(xmlPath);
      preXml = safeGetXml(session.acbr);
      rawResponse = session.acbr.enviar(1, false, true, false);
      postXml = safeGetXml(session.acbr) || preXml;
      pdfPath = await tryGeneratePdfFromXml(session, postXml || preXml || "");
      chaveAcesso = extractAccessKeyFromXml(postXml || preXml || "");
    } else {
      const iniContent = buildNfceIni(context);
      iniPath = await writeAcbrIni(session, iniContent);

      session.acbr.limparLista();
      session.acbr.carregarINI(iniPath);

      preXml = safeGetXml(session.acbr);

      session.acbr.assinar();
      session.acbr.validar();
      postXml = safeGetXml(session.acbr) || preXml;
      chaveAcesso = extractAccessKeyFromXml(postXml || preXml || "");

      if (operation === "emitir_contingencia_offline") {
        pdfPath = await tryGeneratePdfFromXml(session, postXml || preXml || "");
      } else {
        rawResponse = session.acbr.enviar(1, false, true, false);
        postXml = safeGetXml(session.acbr) || postXml || preXml;
        pdfPath = await tryGeneratePdf(session);
      }
    }

    await writeOutput({
      ok: true,
      operation,
      rawResponse,
      preXml,
      postXml,
      pdfPath,
      chaveAcesso,
      paths: {
        configPath: session.configPath,
        iniPath,
        rootDir: session.rootDir,
        xmlDir: session.xmlDir,
        pdfDir: session.pdfDir,
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
      message: error.message || "Falha na emissão da NFC-e.",
      lastReturn,
    });

    throw error;
  } finally {
    await destroyAcbrSession(session);
  }
}

run().catch((error) => {
  console.error("[acbr:nfce:worker] Falha", error);
  process.exitCode = 1;
});
