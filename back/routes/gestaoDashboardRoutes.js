import express from "express";
import { pool } from "../config/conexao.js";
import GestaoDashboardDAO from "../model/gestaoDashboardDAO.js";

const router = express.Router();

const withClient = async (handler) => {
  const client = await pool.connect();
  try {
    return await handler(client);
  } finally {
    client.release();
  }
};

router.get("/dashboard", async (_req, res) => {
  try {
    const data = await withClient((client) => GestaoDashboardDAO.getResumo(client));

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[gestao:dashboard] Falha ao carregar indicadores:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar os indicadores da Gestão V12.",
    });
  }
});

export default router;
