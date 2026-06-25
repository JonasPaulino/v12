import path from "path";
import multer from "multer";
import sharp from "sharp";

const MAX_UPLOAD_BYTES = Number(process.env.TENANT_LOGO_UPLOAD_MAX_BYTES || 8 * 1024 * 1024);
const TARGET_BYTES = Number(process.env.TENANT_LOGO_TARGET_BYTES || 500 * 1024);
const MAX_WIDTH = Number(process.env.TENANT_LOGO_MAX_WIDTH || 900);
const MAX_HEIGHT = Number(process.env.TENANT_LOGO_MAX_HEIGHT || 300);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (String(file.mimetype || "").startsWith("image/")) {
      return cb(null, true);
    }

    return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "logo"));
  },
}).single("logo");

const parseJsonPayload = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;

  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error("Payload da filial inválido.");
  }
};

const compressLogo = async (file) => {
  let output = null;
  let lastError = null;

  for (const quality of [88, 78, 68, 58, 48]) {
    try {
      output = await sharp(file.buffer)
        .rotate()
        .resize({
          width: MAX_WIDTH,
          height: MAX_HEIGHT,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality, effort: 6 })
        .toBuffer();

      if (output.length <= TARGET_BYTES) break;
    } catch (error) {
      lastError = error;
      break;
    }
  }

  if (!output?.length) {
    throw new Error(lastError?.message || "Não foi possível processar a logo.");
  }

  const originalBase = path
    .basename(file.originalname || "logo", path.extname(file.originalname || ""))
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return {
    nome_arquivo: `${originalBase || "logo"}.webp`,
    mime_type: "image/webp",
    conteudo: output,
    tamanho_arquivo: output.length,
  };
};

export const tenantLogoUpload = (req, res, next) => {
  if (!String(req.headers["content-type"] || "").includes("multipart/form-data")) {
    return next();
  }

  return upload(req, res, async (error) => {
    if (error) {
      const message =
        error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
          ? "A logo excede o tamanho permitido."
          : "A logo precisa ser uma imagem válida.";
      return res.status(400).json({ success: false, message });
    }

    try {
      req.body = parseJsonPayload(req.body?.payload);

      if (req.file) {
        req.body.logo = await compressLogo(req.file);
      }

      return next();
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: parseError.message || "Não foi possível processar a logo.",
      });
    }
  });
};
