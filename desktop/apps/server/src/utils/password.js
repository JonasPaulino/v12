import crypto from "node:crypto";

const ITERATIONS = 120000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(String(password || ""), salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");

  return `${ITERATIONS}:${salt}:${hash}`;
}

export function verifyPassword(password, storedHash = "") {
  const [iterationsRaw, salt, originalHash] = String(storedHash).split(":");
  const iterations = Number(iterationsRaw);

  if (!iterations || !salt || !originalHash) return false;

  const hash = crypto
    .pbkdf2Sync(String(password || ""), salt, iterations, KEY_LENGTH, DIGEST)
    .toString("hex");

  if (hash.length !== originalHash.length) return false;

  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(originalHash, "hex"));
}
