import crypto from "crypto";

export const encryptSecret = (text) => {
  if (!text) return null;

  const key = crypto.createHash("sha256").update(String(process.env.CHAVE_TOKEN || "")).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    value: encrypted.toString("base64"),
  });
};

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
