import express from "express";
import verifyServiceToken from "../middleware/serviceToken.js";
import AsaasDAO from "../model/asaasDAO.js";

const router = express.Router();

router.use(verifyServiceToken);

router.post("/charges/pix", async (req, res) => {
  try {
    const payload = AsaasDAO.validarPayloadInterno(req.body || {});
    const data = await AsaasDAO.criarPixCharge(payload);

    return res.status(201).json({
      success: true,
      message: data.reused
        ? "Cobrança PIX já existente reaproveitada com sucesso."
        : "Cobrança PIX criada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[payments:asaas] Falha ao criar cobrança PIX:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível criar a cobrança PIX no Asaas.",
    });
  }
});

export default router;
