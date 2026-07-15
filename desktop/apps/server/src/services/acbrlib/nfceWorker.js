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

function applyOptionalConfig(acbr, sessao, chave, valor) {
  if (valor === undefined || valor === null || valor === "") return;
  try {
    acbr.configGravarValor(sessao, chave, String(valor));
  } catch (error) {
    const message = String(error?.message || error);
    if (
      /Chave .* não existe na Sessão|Chave .* nao existe na Sessao|Sessão .* não existe|Sessao .* nao existe/i.test(
        message,
      )
    ) {
      return;
    }
    throw error;
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

function isLegacyOpenSslError(text = "") {
  return /unsupported|RC2|inner_evp_generic_fetch|digital envelope routines/i.test(
    String(text || ""),
  );
}

function isInvalidPasswordError(text = "") {
  return /invalid password|mac verify error|mac verify failure/i.test(String(text || ""));
}

async function extractPkcs12ToPem({
  certPath,
  pemPath,
  certificadoSenha,
  legacy = false,
  includeKeys = false,
}) {
  return execFileAsync(
    "openssl",
    [
      "pkcs12",
      ...(legacy ? ["-legacy"] : []),
      "-in",
      certPath,
      ...(includeKeys ? ["-nodes"] : ["-nokeys"]),
      "-clcerts",
      "-passin",
      `pass:${certificadoSenha || ""}`,
      "-out",
      pemPath,
    ],
    { maxBuffer: 1024 * 1024, timeout: 30000 },
  );
}

async function exportPemToPkcs12({ pemPath, outputPath, certificadoSenha }) {
  return execFileAsync(
    "openssl",
    [
      "pkcs12",
      "-export",
      "-in",
      pemPath,
      "-out",
      outputPath,
      "-passout",
      `pass:${certificadoSenha || ""}`,
    ],
    { maxBuffer: 1024 * 1024, timeout: 30000 },
  );
}

async function ensureCompatibleCertificateFile({ certPath, certificadoSenha }) {
  if (!(await hasOpenSsl())) {
    return {
      certPath,
      normalized: false,
      checked: false,
      usedLegacyInput: false,
    };
  }

  const tempPem = path.join(os.tmpdir(), `v12-pdv-cert-${process.pid}-${Date.now()}.pem`);
  const normalizedPfx = path.join(
    path.dirname(certPath),
    `certificado-a1-runtime-${process.pid}-${Date.now()}.pfx`,
  );
  let usedLegacyInput = false;

  try {
    await extractPkcs12ToPem({
      certPath,
      pemPath: tempPem,
      certificadoSenha,
      includeKeys: true,
    });
  } catch (error) {
    const stderr = String(error.stderr || "").trim();
    if (isInvalidPasswordError(stderr)) {
      throw new Error("Senha do certificado A1 inválida ou certificado incompatível.");
    }

    if (isLegacyOpenSslError(stderr)) {
      try {
        await fs.rm(tempPem, { force: true }).catch(() => {});
        await extractPkcs12ToPem({
          certPath,
          pemPath: tempPem,
          certificadoSenha,
          legacy: true,
          includeKeys: true,
        });
        usedLegacyInput = true;
      } catch (legacyError) {
        const legacyStderr = String(legacyError.stderr || "").trim();
        if (isInvalidPasswordError(legacyStderr)) {
          throw new Error("Senha do certificado A1 inválida ou certificado incompatível.");
        }
        throw new Error(legacyStderr || "Não foi possível validar o certificado A1.");
      }
    } else {
      throw new Error(stderr || error.message || "Não foi possível validar o certificado A1.");
    }
  }

  try {
    await exportPemToPkcs12({
      pemPath: tempPem,
      outputPath: normalizedPfx,
      certificadoSenha,
    });

    return {
      certPath: normalizedPfx,
      normalized: true,
      checked: true,
      usedLegacyInput,
    };
  } catch (error) {
    const stderr = String(error.stderr || "").trim();
    if (isInvalidPasswordError(stderr)) {
      throw new Error("Senha do certificado A1 inválida ou certificado incompatível.");
    }
    throw new Error(
      stderr || "Não foi possível preparar o certificado A1 em formato compatível para o PDV.",
    );
  } finally {
    await fs.rm(tempPem, { force: true }).catch(() => {});
  }
}

function normalizeAcbrCertificateMessage(message = "") {
  const text = String(message || "").trim();
  if (!isLegacyOpenSslError(text)) {
    return text;
  }

  return "O certificado A1 da filial foi sincronizado, mas a assinatura local falhou por incompatibilidade criptografica do PFX. Reimporte ou converta o certificado para um formato compativel com o OpenSSL atual.";
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
  let phase = "init";
  let iniPath = null;
  let runtimeCertInfo = null;

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
    console.log("[acbr:nfce:worker] Inicio", {
      tenantId,
      vendaId,
      operation,
      formaEmissao,
      ambiente: context?.nfce?.ambiente,
      serie: context?.nfce?.serie,
      numero: context?.nfce?.numero,
      itens: Array.isArray(context?.itens) ? context.itens.length : 0,
      pagamentos: Array.isArray(context?.pagamentos) ? context.pagamentos.length : 0,
    });

    phase = "validar_certificado";
    runtimeCertInfo = await ensureCompatibleCertificateFile({
      certPath: session.certPath,
      certificadoSenha,
    });
    if (runtimeCertInfo?.certPath && runtimeCertInfo.certPath !== session.certPath) {
      session.certPath = runtimeCertInfo.certPath;
      applyOptionalConfig(session.acbr, "DFe", "ArquivoPFX", session.certPath);
      applyOptionalConfig(session.acbr, "DFe", "Senha", certificadoSenha || "");
      applyOptionalConfig(session.acbr, "Certificado", "ArquivoPFX", session.certPath);
      applyOptionalConfig(session.acbr, "Certificado", "Senha", certificadoSenha || "");
      session.acbr.configGravar(session.configPath);
    }
    console.log("[acbr:nfce:worker] Certificado preparado", {
      vendaId,
      normalized: Boolean(runtimeCertInfo?.normalized),
      usedLegacyInput: Boolean(runtimeCertInfo?.usedLegacyInput),
      runtimeCertPath: runtimeCertInfo?.certPath || session.certPath,
    });

    phase = "configurar_csc";
    session.acbr.configGravarValor("NFE", "IdCSC", String(context.configuracao.nfce_id_token_csc || ""));
    session.acbr.configGravarValor("NFE", "CSC", String(context.configuracao.nfce_csc || ""));
    session.acbr.configGravar(session.configPath);

    let preXml = null;
    let postXml = null;
    let rawResponse = null;
    let pdfPath = null;
    let chaveAcesso = null;

    if (operation === "transmitir_xml_contingencia") {
      phase = "gravar_xml_contingencia";
      const xmlPath = await writeXmlArtifact(session, "nfce-contingencia.xml", xmlContent || "");
      phase = "carregar_xml_contingencia";
      session.acbr.limparLista();
      session.acbr.carregarXML(xmlPath);
      preXml = safeGetXml(session.acbr);
      console.log("[acbr:nfce:worker] XML contingencia carregado", {
        vendaId,
        xmlPath,
        hasPreXml: Boolean(preXml),
      });
      phase = "enviar_xml_contingencia";
      rawResponse = session.acbr.enviar(1, false, true, false);
      postXml = safeGetXml(session.acbr) || preXml;
      phase = "gerar_pdf_contingencia_transmissao";
      pdfPath = await tryGeneratePdfFromXml(session, postXml || preXml || "");
      chaveAcesso = extractAccessKeyFromXml(postXml || preXml || "");
    } else {
      phase = "montar_ini";
      const iniContent = buildNfceIni(context);
      iniPath = await writeAcbrIni(session, iniContent);
      console.log("[acbr:nfce:worker] INI gerado", {
        vendaId,
        iniPath,
        rootDir: session.rootDir,
        xmlDir: session.xmlDir,
        pdfDir: session.pdfDir,
      });

      phase = "carregar_ini";
      session.acbr.limparLista();
      session.acbr.carregarINI(await fs.readFile(iniPath, "utf8"));

      preXml = safeGetXml(session.acbr);
      console.log("[acbr:nfce:worker] INI carregado", {
        vendaId,
        hasPreXml: Boolean(preXml),
        chavePreXml: extractAccessKeyFromXml(preXml || ""),
      });

      phase = "assinar";
      session.acbr.assinar();
      phase = "validar";
      session.acbr.validar();
      postXml = safeGetXml(session.acbr) || preXml;
      chaveAcesso = extractAccessKeyFromXml(postXml || preXml || "");
      console.log("[acbr:nfce:worker] XML assinado/validado", {
        vendaId,
        hasPostXml: Boolean(postXml),
        chaveAcesso,
      });

      if (operation === "emitir_contingencia_offline") {
        phase = "gerar_pdf_contingencia_offline";
        pdfPath = await tryGeneratePdfFromXml(session, postXml || preXml || "");
      } else {
        phase = "enviar";
        rawResponse = session.acbr.enviar(1, false, true, false);
        postXml = safeGetXml(session.acbr) || postXml || preXml;
        phase = "gerar_pdf";
        pdfPath = await tryGeneratePdf(session);
      }
    }

    phase = "finalizar";

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

    console.error("[acbr:nfce:worker] Erro detalhado", {
      tenantId,
      vendaId,
      operation,
      phase,
      message: error?.message || String(error),
      lastReturn,
      paths: {
        configPath: session?.configPath,
        iniPath,
        rootDir: session?.rootDir,
        xmlDir: session?.xmlDir,
        pdfDir: session?.pdfDir,
      },
    });

    const normalizedMessage = normalizeAcbrCertificateMessage(error.message || "");
    const normalizedLastReturn = normalizeAcbrCertificateMessage(lastReturn || "");

    await writeOutput({
      ok: false,
      phase,
      message: normalizedMessage || "Falha na emissão da NFC-e.",
      lastReturn: normalizedLastReturn,
    });

    throw new Error(normalizedMessage || error.message || "Falha na emissão da NFC-e.");
  } finally {
    if (runtimeCertInfo?.normalized && runtimeCertInfo.certPath) {
      await fs.rm(runtimeCertInfo.certPath, { force: true }).catch(() => {});
    }
    await destroyAcbrSession(session);
  }
}

run().catch((error) => {
  console.error("[acbr:nfce:worker] Falha", error);
  process.exitCode = 1;
});
