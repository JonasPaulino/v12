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

router.get("/usuarios/:usuarioId", async (req, res) => {
  try {
    const data = await withClient((client) =>
      GestaoUsuarioDAO.buscarPorId(client, req.params.usuarioId)
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Usuário interno não encontrado.",
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[gestao:usuario] Falha ao buscar usuario:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar o usuário interno.",
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

router.put("/usuarios/:usuarioId", async (req, res) => {
  const client = await pool.connect();
  try {
    const data = await GestaoUsuarioDAO.atualizar(client, {
      actorUserId: req.user?.userId,
      usuarioId: req.params.usuarioId,
      payload: req.body || {},
    });

    return res.json({
      success: true,
      message: "Usuário interno atualizado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[gestao:usuario] Falha ao atualizar usuario:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível atualizar o usuário interno.",
    });
  } finally {
    client.release();
  }
});

export default router;
