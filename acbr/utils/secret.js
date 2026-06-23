import crypto from "crypto";

export const decryptSecret = (payload) => {
  if (!payload) return null;

  const parsed = JSON.parse(String(payload));
  const key = crypto.createHash("sha256").update(String(process.env.CHAVE_TOKEN || "")).digest();
  const iv = Buffer.from(parsed.iv, "base64");
  const tag = Buffer.from(parsed.tag, "base64");
  const encrypted = Buffer.from(parsed.value, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
};
