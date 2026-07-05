import crypto from "node:crypto";

const ITERATIONS = 120000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";
const WEB_KEY_LENGTH = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(String(password || ""), salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");

  return `${ITERATIONS}:${salt}:${hash}`;
}

export function verifyPassword(password, storedHash = "") {
  const parts = String(storedHash).split(":");
  if (parts.length === 2) {
    return verifyWebPassword(password, parts[0], parts[1]);
  }

  const [iterationsRaw, salt, originalHash] = parts;
  const iterations = Number(iterationsRaw);

  if (!iterations || !salt || !originalHash) return false;

  const hash = crypto
    .pbkdf2Sync(String(password || ""), salt, iterations, KEY_LENGTH, DIGEST)
    .toString("hex");

  if (hash.length !== originalHash.length) return false;

  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(originalHash, "hex"));
}

function verifyWebPassword(password, salt, originalHash) {
  if (!salt || !originalHash) return false;

  const hash = crypto
    .scryptSync(String(password || ""), Buffer.from(salt, "hex"), WEB_KEY_LENGTH)
    .toString("hex");

  if (hash.length !== originalHash.length) return false;

  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(originalHash, "hex"));
}
