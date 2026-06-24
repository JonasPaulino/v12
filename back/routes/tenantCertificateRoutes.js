import express from "express";
import { previewCertificate } from "../utils/certificatePreview.js";
import { consultarCnpjBrasilApi } from "../utils/brasilApi.js";

const router = express.Router();

router.post("/preview", async (req, res) => {
  try {
    const certificado = req.body?.certificado || {};
    const certificadoData = await previewCertificate({
      certificadoBase64: certificado.conteudo_base64,
      certificadoSenha: certificado.senha,
      scopeKey: `${req.user?.userId || "user"}-${Date.now()}`,
    });

    const consultaBrasilApi = await consultarCnpjBrasilApi(certificadoData.cnpj);

    return res.json({
      success: true,
      data: {
        certificado: certificadoData,
        empresa: consultaBrasilApi.empresa,
        brasilapi: consultaBrasilApi.raw,
      },
    });
  } catch (error) {
    console.error("[tenant-certificate] Falha ao ler certificado:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível ler o certificado.",
    });
  }
});

export default router;
