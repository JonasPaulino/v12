import crypto from "crypto";

const KEY_LENGTH = 64;

export const hashPassword = (plainTextPassword) => {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(plainTextPassword, salt, KEY_LENGTH).toString("hex");
  return `${salt.toString("hex")}:${hash}`;
};

export const verifyPassword = (plainTextPassword, storedHash) => {
  if (!plainTextPassword || !storedHash || !storedHash.includes(":")) {
    return false;
  }

  const [salt, originalHash] = storedHash.split(":");
  const saltBuffer = Buffer.from(salt, "hex");
  const computedHash = crypto
    .scryptSync(plainTextPassword, saltBuffer, KEY_LENGTH)
    .toString("hex");

  return crypto.timingSafeEqual(
    Buffer.from(computedHash, "hex"),
    Buffer.from(originalHash, "hex")
  );
};
