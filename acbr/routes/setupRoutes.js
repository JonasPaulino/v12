import express from "express";
import CompanySetupProvider from "../providers/acbrlib/companySetup.js";

const router = express.Router();

router.post(
  "/company-preview",
  express.raw({
    type: ["application/octet-stream", "application/x-pkcs12", "application/pkcs12"],
    limit: "25mb",
  }),
  async (req, res) => {
    try {
      const isBinaryBody = Buffer.isBuffer(req.body) && req.body.length > 0;
      const certificado = !isBinaryBody ? req.body?.certificado || {} : {};
      const certificadoBase64 = isBinaryBody
        ? req.body.toString("base64")
        : certificado.conteudo_base64;
      const certificadoSenha = isBinaryBody
        ? req.headers["x-certificado-senha"]
        : certificado.senha;
      const uf = isBinaryBody ? req.headers["x-uf-consulta"] : req.body?.uf;
      const ambiente = isBinaryBody ? req.headers["x-ambiente"] : req.body?.ambiente || "2";

      const data = await CompanySetupProvider.previewFromCertificate({
        certificadoBase64,
        certificadoSenha,
        uf,
        ambiente,
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
  }
);

export default router;
