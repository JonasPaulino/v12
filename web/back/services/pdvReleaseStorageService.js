import crypto from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const RELEASE_STORAGE_DIR =
  process.env.PDV_RELEASE_STORAGE_DIR || path.resolve(process.cwd(), "storage", "pdv-releases");

const ALLOWED_EXTENSIONS = new Set([".exe", ".msi", ".zip", ".7z"]);

const sanitizeFileName = (value) =>
  String(value || "pdv-release")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180);

export const validateReleaseFileName = (fileName) => {
  const extension = path.extname(String(fileName || "")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Arquivo inválido. Envie .exe, .msi, .zip ou .7z.");
  }
};

export const sha256File = async (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });

export const sha512FileBase64 = async (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha512");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("base64")));
  });

const copyFileByStream = async (source, target) =>
  new Promise((resolve, reject) => {
    const reader = createReadStream(source);
    const writer = createWriteStream(target);
    reader.on("error", reject);
    writer.on("error", reject);
    writer.on("finish", resolve);
    reader.pipe(writer);
  });

export const storeReleaseUpload = async ({ file, versao, canal, plataforma }) => {
  if (!file?.path) {
    throw new Error("Arquivo do release é obrigatório.");
  }

  validateReleaseFileName(file.originalname);
  await fs.mkdir(RELEASE_STORAGE_DIR, { recursive: true });

  const extension = path.extname(file.originalname).toLowerCase();
  const hash = await sha256File(file.path);
  const finalName = sanitizeFileName(
    `v12-pdv-${canal || "stable"}-${plataforma || "win32-x64"}-${versao || Date.now()}-${hash.slice(
      0,
      10,
    )}${extension}`,
  );
  const targetPath = path.join(RELEASE_STORAGE_DIR, finalName);

  try {
    await fs.rename(file.path, targetPath);
  } catch (error) {
    if (error?.code !== "EXDEV") throw error;
    await copyFileByStream(file.path, targetPath);
    await fs.rm(file.path, { force: true });
  }

  return {
    arquivoNome: finalName,
    arquivoOriginal: file.originalname,
    arquivoPath: targetPath,
    arquivoSha256: hash,
    tamanhoBytes: Number(file.size || 0),
  };
};

export const openReleaseReadStream = async (release) => {
  if (!release?.arquivo_path) {
    throw new Error("Arquivo do release não encontrado.");
  }

  await fs.access(release.arquivo_path);
  return createReadStream(release.arquivo_path);
};
