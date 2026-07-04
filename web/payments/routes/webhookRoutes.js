import express from "express";
import AsaasDAO from "../model/asaasDAO.js";

const router = express.Router();

router.post("/asaas", async (req, res) => {
  try {
    await AsaasDAO.registrarWebhook({
      headers: req.headers || {},
      body: req.body || {},
    });

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error("[payments:webhook] Falha ao processar webhook Asaas:", error);
    return res.status(400).json({
      received: false,
      message: error.message || "Não foi possível processar o webhook do Asaas.",
    });
  }
});

export default router;
