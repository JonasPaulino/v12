import express from "express";
import CompanySetupProvider from "../providers/acbrlib/companySetup.js";

const router = express.Router();

router.post("/company-preview", async (req, res) => {
  try {
    const certificado = req.body?.certificado || {};
    const data = await CompanySetupProvider.previewFromCertificate({
      certificadoBase64: certificado.conteudo_base64,
      certificadoSenha: certificado.senha,
      uf: req.body?.uf,
      ambiente: req.body?.ambiente || "2",
      scopeKey: `${req.user?.userId || "user"}-${Date.now()}`,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[acbr:setup] Falha ao consultar dados da empresa:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível consultar os dados da empresa.",
    });
  }
});

export default router;
