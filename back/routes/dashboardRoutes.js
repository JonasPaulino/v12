import express from "express";
import dashboardDAO from "../model/dashboardDAO.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const data = await dashboardDAO.getResumo(req.db, req.user.userId);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[dashboard] Falha ao carregar resumo:", error);
    return res.status(500).json({ error: "Erro ao carregar dashboard." });
  }
});

export default router;
