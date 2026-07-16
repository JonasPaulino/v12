import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const MIME_7Z = "application/x-7z-compressed";

let cachedToken = null;

function base64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

function normalizePrivateKey(value) {
  return String(value || "").replace(/\\n/g, "\n");
}

async function parseCredential(config) {
  const credential = String(config?.credential || "").trim();

  if (!credential) {
    throw new Error("Credencial do Google Drive não configurada na Gestão V12.");
  }

  if (credential.startsWith("{")) {
    return JSON.parse(credential);
  }

  try {
    const decoded = Buffer.from(credential, "base64").toString("utf8");
    if (decoded.trim().startsWith("{")) {
      return JSON.parse(decoded);
    }
  } catch {}

  const filePath = path.resolve(credential);
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function requestAccessToken(config) {
  const account = await parseCredential(config);
  const clientEmail = account.client_email;
  const privateKey = normalizePrivateKey(account.private_key);

  if (!clientEmail || !privateKey) {
    throw new Error("Conta de serviço do Google Drive inválida.");
  }

  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: config.scope || "https://www.googleapis.com/auth/drive.file",
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now,
    })
  )}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(privateKey);
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Falha ao autenticar no Google Drive.");
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 - 60000,
  };

  return cachedToken.accessToken;
}

async function getAccessToken(config) {
  if (cachedToken?.accessToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  return requestAccessToken(config);
}

export async function uploadBackupToGoogleDrive({
  config,
  filePath,
  name,
  sha256,
  tenantId,
  terminalCodigo,
}) {
  if (!config?.ativo) {
    throw new Error("Backup no Google Drive não está ativo na Gestão V12.");
  }

  const token = await getAccessToken(config);
  const stat = await fs.stat(filePath);
  const metadata = {
    name,
    mimeType: MIME_7Z,
    appProperties: {
      sistema: "v12-pdv",
      tipo: "backup_fiscal",
      tenant_id: String(tenantId),
      terminal_codigo: String(terminalCodigo || ""),
      sha256: String(sha256 || ""),
    },
  };

  if (config.folderId) {
    metadata.parents = [config.folderId];
  }

  const createUrl = new URL(DRIVE_UPLOAD_URL);
  createUrl.searchParams.set("uploadType", "resumable");
  createUrl.searchParams.set("fields", "id,name,webViewLink,size,createdTime");
  createUrl.searchParams.set("supportsAllDrives", "true");

  const createResponse = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": MIME_7Z,
      "X-Upload-Content-Length": String(stat.size),
    },
    body: JSON.stringify(metadata),
  });

  if (!createResponse.ok) {
    const data = await createResponse.json().catch(() => ({}));
    throw new Error(data.error?.message || "Falha ao iniciar upload no Google Drive.");
  }

  const uploadUrl = createResponse.headers.get("location");
  if (!uploadUrl) {
    throw new Error("Google Drive não retornou URL de upload resumível.");
  }

  const content = await fs.readFile(filePath);
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": MIME_7Z,
      "Content-Length": String(stat.size),
    },
    body: content,
  });
  const uploaded = await uploadResponse.json().catch(() => ({}));

  if (!uploadResponse.ok) {
    throw new Error(uploaded.error?.message || "Falha ao enviar backup para o Google Drive.");
  }

  return uploaded;
}
