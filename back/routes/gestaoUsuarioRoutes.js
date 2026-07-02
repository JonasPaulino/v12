import express from "express";
import { pool } from "../config/conexao.js";
import GestaoUsuarioDAO from "../model/gestaoUsuarioDAO.js";

const router = express.Router();

const withClient = async (handler) => {
  const client = await pool.connect();
  try {
    return await handler(client);
  } finally {
    client.release();
  }
};

router.get("/usuarios/listar", async (req, res) => {
  try {
    const result = await withClient((client) =>
      GestaoUsuarioDAO.listar(client, {
        page: req.query.page,
        limit: req.query.limit,
        search: String(req.query.search || ""),
      })
    );

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[gestao:usuario] Falha ao listar usuarios:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar os usuários internos da Gestão V12.",
    });
  }
});

router.post("/usuarios", async (req, res) => {
  const client = await pool.connect();
  try {
    const data = await GestaoUsuarioDAO.criar(client, req.body || {});

    return res.status(201).json({
      success: true,
      message: "Usuário interno cadastrado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[gestao:usuario] Falha ao criar usuario:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cadastrar o usuário interno.",
    });
  } finally {
    client.release();
  }
});

export default router;
