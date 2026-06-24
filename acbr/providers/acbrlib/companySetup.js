import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import ConsultaCnpjProvider from "./consultaCnpjProvider.js";

const execFileAsync = promisify(execFile);

const normalizeBase64 = (value) =>
  String(value || "")
    .replace(/^data:.*?;base64,/i, "")
    .replace(/\s/g, "")
    .trim();
const normalizeUF = (value) => String(value || "").trim().toUpperCase();
const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

const extractCnpjFromText = (value = "") => {
  const patterns = [
    /2\.16\.76\.1\.3\.3\s*=\s*([0-9./-]{14,18})/i,
    /OID\.2\.16\.76\.1\.3\.3\s*=\s*([0-9./-]{14,18})/i,
    /CNPJ\s*[:= ]\s*([0-9./-]{14,18})/i,
    /serialNumber\s*=\s*([0-9./-]{14,18})/i,
    /serialNumber\s*=\s*.*?:\s*([0-9./-]{14,18})/i,
    /CN\s*=\s*[^,\n:]+:\s*([0-9./-]{14,18})/i,
    /CN\s*=\s*.*?\b([0-9]{2}\.?[0-9]{3}\.?[0-9]{3}\/?[0-9]{4}-?[0-9]{2})\b/i,
    /othername:[^,\n]*?([0-9./-]{14,18})/i,
  ];

  for (const pattern of patterns) {
    const rawMatch = value.match(pattern)?.[1];
    const normalized = onlyDigits(rawMatch);

    if (normalized.length === 14) {
      return normalized;
    }
  }

  return "";
};

const extractCnpjFromAltName = (altNameText = "") => {
  const directMatch = extractCnpjFromText(altNameText);
  if (directMatch) return directMatch;

  const maskedMatches = [...String(altNameText).matchAll(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g)]
    .map((match) => onlyDigits(match[0]))
    .filter((value) => value.length === 14);

  if (maskedMatches.length === 1) return maskedMatches[0];

  const plainMatches = [...String(altNameText).matchAll(/\b\d{14}\b/g)]
    .map((match) => match[0])
    .filter(Boolean);

  if (plainMatches.length === 1) return plainMatches[0];

  return "";
};

const parseCertificateSubject = ({ subject = "", certificateText = "", altNameText = "" }) => {
  const cnpj =
    extractCnpjFromText(subject) ||
    extractCnpjFromAltName(altNameText) ||
    extractCnpjFromText(certificateText) ||
    "";

  const commonName =
    subject.match(/CN=([^,]+)/i)?.[1]?.trim() ||
    subject.match(/CN = ([^,]+)/i)?.[1]?.trim() ||
    certificateText.match(/Subject:.*?CN\s*=\s*([^,\n/]+)/i)?.[1]?.trim() ||
    "";

  return {
    cnpj,
    common_name: commonName,
    subject,
    certificate_text: certificateText,
    alt_name_text: altNameText,
  };
};

const extractCertificatePreview = async ({ certificadoBuffer, certificadoSenha, scopeKey }) => {
  const workDir = path.resolve(process.cwd(), "temp", "cert-preview", String(scopeKey || Date.now()));
  const pfxPath = path.join(workDir, "certificado.pfx");
  const pemPath = path.join(workDir, "certificado.pem");

  await fs.mkdir(workDir, { recursive: true });
  await fs.writeFile(pfxPath, certificadoBuffer);

  try {
    await execFileAsync("openssl", [
      "pkcs12",
      "-in",
      pfxPath,
      "-clcerts",
      "-nokeys",
      "-passin",
      `pass:${certificadoSenha}`,
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

    const { stdout: textOut } = await execFileAsync("openssl", [
      "x509",
      "-in",
      pemPath,
      "-noout",
      "-text",
    ]);

    const { stdout: altNameOut } = await execFileAsync("openssl", [
      "x509",
      "-in",
      pemPath,
      "-noout",
      "-ext",
      "subjectAltName",
      "-certopt",
      "ext_parse,ext_dump",
    ]).catch(() => ({ stdout: "" }));

    return parseCertificateSubject({
      subject: subjectOut,
      certificateText: textOut,
      altNameText: altNameOut,
    });
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
};

class CompanySetupProvider {
  static async previewFromCertificate({
    certificadoBase64,
    certificadoSenha,
    uf,
    ambiente = "2",
    scopeKey,
  }) {
    const normalizedBase64 = normalizeBase64(certificadoBase64);
    const normalizedSenha = String(certificadoSenha || "");
    const normalizedUf = normalizeUF(uf);

    if (!normalizedBase64) {
      throw new Error("Conteúdo do certificado não informado.");
    }

    if (!normalizedSenha) {
      throw new Error("Senha do certificado não informada.");
    }

    if (!normalizedUf) {
      throw new Error("UF da consulta não informada.");
    }

    const certificadoBuffer = Buffer.from(normalizedBase64, "base64");
    if (!certificadoBuffer.length) {
      throw new Error("Conteúdo do certificado inválido.");
    }

    const certificate = await extractCertificatePreview({
      certificadoBuffer,
      certificadoSenha: normalizedSenha,
      scopeKey,
    });

    if (!certificate.cnpj) {
      console.error("[acbr:setup] CNPJ não encontrado no certificado.", {
        subject: certificate.subject,
        sample: String(certificate.certificate_text || "").slice(0, 1200),
        subject_alt_name: String(certificate.alt_name_text || "").slice(0, 1200),
      });
      throw new Error("Não foi possível identificar o CNPJ no certificado A1.");
    }

    let cadastro = null;
    let consultaErro = null;

    try {
      cadastro = await ConsultaCnpjProvider.consultar({
        cnpj: certificate.cnpj,
        scopeKey,
        uf: normalizedUf,
        ambiente,
      });
    } catch (error) {
      consultaErro = error.message || "Falha ao consultar o cadastro do contribuinte.";
    }

    return {
      certificado: {
        cnpj: certificate.cnpj,
        common_name: certificate.common_name,
        subject: certificate.subject,
      },
      empresa: {
        cnpj: certificate.cnpj,
        nome_razao: cadastro?.nome_razao || certificate.common_name || "",
        nome_fantasia: cadastro?.nome_fantasia || "",
        inscricao_estadual: cadastro?.inscricao_estadual || "",
        cep: cadastro?.cep || "",
        logradouro: cadastro?.logradouro || "",
        numero: cadastro?.numero || "",
        complemento: cadastro?.complemento || "",
        bairro: cadastro?.bairro || "",
        cidade: cadastro?.cidade || "",
        uf: cadastro?.uf || normalizedUf,
        codigo_ibge: cadastro?.codigo_ibge || "",
        pais: "Brasil",
        situacao_cadastro: cadastro?.situacao || "",
      },
      raw: cadastro?.raw || null,
      consulta_ok: !consultaErro,
      consulta_erro: consultaErro,
    };
  }
}

export default CompanySetupProvider;
