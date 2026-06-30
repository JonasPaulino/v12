import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const OPENSSL_TIMEOUT_MS = 30000;
const OPENSSL_MAX_BUFFER = 1024 * 1024;

const normalizeBase64 = (value) =>
  String(value || "")
    .replace(/^data:.*?;base64,/i, "")
    .replace(/\s/g, "")
    .trim();

const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

const extractCnpj = (text = "") => {
  const patterns = [
    /CN=([^,\n]+):\s*([0-9./-]{14,18})/i,
    /([0-9]{2}\.?[0-9]{3}\.?[0-9]{3}\/?[0-9]{4}-?[0-9]{2})/,
    /serialNumber\s*=\s*([0-9./-]{14,18})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const raw = match?.[2] || match?.[1] || "";
    const digits = onlyDigits(raw);
    if (digits.length === 14) return digits;
  }

  return "";
};

const extractCommonName = (subject = "") =>
  subject.match(/CN=([^,]+)/i)?.[1]?.trim() ||
  subject.match(/CN = ([^,]+)/i)?.[1]?.trim() ||
  "";

const extractValidity = (text = "") => {
  const match = String(text || "").match(/notAfter=([^\n]+)/i);
  if (!match?.[1]) return null;

  const parsed = new Date(match[1].trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const shouldRetryWithLegacyProvider = (error) => {
  const stderr = String(error?.stderr || "");
  const message = String(error?.message || "");
  return /unsupported|RC2|inner_evp_generic_fetch|digital envelope routines/i.test(
    `${stderr}\n${message}`
  );
};

const isPasswordError = (error) => {
  const stderr = String(error?.stderr || "");
  const message = String(error?.message || "");
  return /invalid password|mac verify error|mac verify failure/i.test(`${stderr}\n${message}`);
};

const runPkcs12Extract = async ({ pfxPath, pemPath, senha, legacy = false }) => {
  const args = [
    "pkcs12",
    ...(legacy ? ["-legacy"] : []),
    "-in",
    pfxPath,
    "-clcerts",
    "-nokeys",
    "-passin",
    `pass:${senha}`,
    "-out",
    pemPath,
  ];

  return execFileAsync("openssl", args, {
    maxBuffer: OPENSSL_MAX_BUFFER,
    timeout: OPENSSL_TIMEOUT_MS,
  });
};

const extractCertificatePem = async ({ pfxPath, pemPath, senha }) => {
  try {
    await runPkcs12Extract({ pfxPath, pemPath, senha });
  } catch (error) {
    if (isPasswordError(error)) {
      throw new Error("Senha do certificado A1 inválida.");
    }

    if (!shouldRetryWithLegacyProvider(error)) {
      throw new Error("Não foi possível ler o certificado A1 informado.");
    }

    try {
      await fs.rm(pemPath, { force: true }).catch(() => {});
      await runPkcs12Extract({ pfxPath, pemPath, senha, legacy: true });
    } catch (legacyError) {
      if (isPasswordError(legacyError)) {
        throw new Error("Senha do certificado A1 inválida.");
      }

      throw new Error(
        "Não foi possível ler o certificado A1. O arquivo pode estar corrompido ou em formato incompatível."
      );
    }
  }
};

export const previewCertificate = async ({ certificadoBase64, certificadoSenha, scopeKey }) => {
  const normalizedBase64 = normalizeBase64(certificadoBase64);
  const senha = String(certificadoSenha || "");

  if (!normalizedBase64) {
    throw new Error("Conteúdo do certificado não informado.");
  }

  if (!senha) {
    throw new Error("Senha do certificado não informada.");
  }

  const workDir = path.resolve(process.cwd(), "temp", "cert-preview", String(scopeKey || Date.now()));
  const pfxPath = path.join(workDir, "certificado.pfx");
  const pemPath = path.join(workDir, "certificado.pem");

  await fs.mkdir(workDir, { recursive: true });
  await fs.writeFile(pfxPath, Buffer.from(normalizedBase64, "base64"));

  try {
    await extractCertificatePem({ pfxPath, pemPath, senha });

    const { stdout: subjectOut } = await execFileAsync("openssl", [
      "x509",
      "-in",
      pemPath,
      "-noout",
      "-subject",
      "-nameopt",
      "RFC2253",
    ]);

    const { stdout: endDateOut } = await execFileAsync("openssl", [
      "x509",
      "-in",
      pemPath,
      "-noout",
      "-enddate",
    ]);

    const commonName = extractCommonName(subjectOut);
    const cnpj = extractCnpj(subjectOut);
    const validadeEm = extractValidity(endDateOut);

    return {
      cnpj,
      common_name: commonName,
      subject: subjectOut,
      validade_em: validadeEm,
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
};
