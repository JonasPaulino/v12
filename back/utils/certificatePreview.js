import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

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
    await execFileAsync("openssl", [
      "pkcs12",
      "-in",
      pfxPath,
      "-clcerts",
      "-nokeys",
      "-passin",
      `pass:${senha}`,
      "-out",
      pemPath,
    ]);

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
