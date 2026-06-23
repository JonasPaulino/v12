import express from "express";
import { pool } from "../config/conexao.js";
import TenantSetupDAO from "../model/tenantSetupDAO.js";

const router = express.Router();

router.post("/", async (req, res) => {
  let client;

  try {
    client = await pool.connect();
    const data = await TenantSetupDAO.criarFilial(
      client,
      req.body || {},
      Number(req.user?.userId) || null
    );

    return res.status(201).json({
      success: true,
      message: "Filial cadastrada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[tenant-setup] Falha ao cadastrar filial:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cadastrar a filial.",
    });
  } finally {
    client?.release();
  }
});

export default router;
