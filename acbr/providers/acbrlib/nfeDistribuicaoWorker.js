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
  console.error("[acbr:nfe:distribuicao:worker]", { step, ...details });
};

const validateCertificateFile = async ({ certPath, certificadoSenha }) => {
  const tempPem = path.join(os.tmpdir(), `v12-dist-cert-${process.pid}-${Date.now()}.pem`);
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
    await fs.rm(tempPem, { force: true });
  }
};

const extractXmlFromDistribution = (rawResponse) => {
  const text = String(rawResponse || "");
  const match = text.match(/^XML=(.+)$/im);
  return match?.[1]?.trim() || "";
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

const findSavedXml = async ({ xmlDir, chaveAcesso }) => {
  const files = await listXmlFiles(xmlDir);
  const sortedFiles = files.sort((a, b) => {
    const aHasKey = a.includes(chaveAcesso) ? 0 : 1;
    const bHasKey = b.includes(chaveAcesso) ? 0 : 1;
    return aHasKey - bHasKey || a.localeCompare(b);
  });

  for (const filePath of sortedFiles) {
    const xml = await fs.readFile(filePath, "utf8");
    if (/<(procNFe|NFe|resNFe)\b/i.test(xml)) {
      return xml.trim();
    }
  }

  return "";
};

const distribuicaoDFePorChave = (acbr, cufAutor, cnpjCpfAutor, chaveAcesso) => {
  const acbrBuffer = new ACBrBuffer(TAMANHO_PADRAO);

  try {
    const status = acbr.LIB_DistribuicaoDFePorChave(
      acbr.getHandle(),
      Number(cufAutor),
      String(cnpjCpfAutor || ""),
      String(chaveAcesso || ""),
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
    cufAutor,
    cnpjCpfAutor,
    uf,
    ambiente,
    certificadoBase64,
    certificadoSenha,
  } = payload;

  const scopeKey = `tenant-${tenantId}-dist-${chaveAcesso}`;
  const session = await createAcbrLookupSession({
    scopeKey,
    certificadoBuffer: Buffer.from(certificadoBase64, "base64"),
    certificadoSenha,
  });

  try {
    logStep("certificado:validar:start", { tenantId, chaveAcesso });
    await validateCertificateFile({ certPath: session.certPath, certificadoSenha });
    logStep("certificado:validar:done", { tenantId, chaveAcesso });

    logStep("configure:start", { tenantId, chaveAcesso, uf, ambiente });
    await configureAcbrLookupSession(session, { uf, ambiente });
    logStep("configure:done", { tenantId, chaveAcesso, configPath: session.configPath });

    logStep("distribuicao:start", { tenantId, chaveAcesso, cufAutor });
    const rawResponse = distribuicaoDFePorChave(session.acbr, cufAutor, cnpjCpfAutor, chaveAcesso);
    const xml =
      extractXmlFromDistribution(rawResponse) ||
      (await findSavedXml({ xmlDir: session.xmlDir, chaveAcesso }));
    logStep("distribuicao:done", { tenantId, chaveAcesso, hasXml: !!xml });

    await writeOutput({
      ok: true,
      rawResponse,
      xml,
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
      message: error.message || "Falha na distribuição DFe.",
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
  console.error("[acbr:nfe:distribuicao:worker] Falha", error);
  process.exitCode = 1;
});
