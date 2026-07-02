import express from "express";
import { pool } from "../config/conexao.js";
import GestaoPessoaDAO from "../model/gestaoPessoaDAO.js";

const router = express.Router();

const withClient = async (handler) => {
  const client = await pool.connect();
  try {
    return await handler(client);
  } finally {
    client.release();
  }
};

router.get("/pessoas/listar", async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const search = String(req.query.search || "");

    const result = await withClient(
      (client) => GestaoPessoaDAO.listar(client, { page, limit, search })
    );

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[gestao:pessoa] Falha ao listar pessoas:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar as pessoas da gestão.",
    });
  }
});

router.get("/pessoas/:id", async (req, res) => {
  try {
    const data = await withClient(
      (client) => GestaoPessoaDAO.buscarPorId(client, Number(req.params.id))
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Pessoa não encontrada.",
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[gestao:pessoa] Falha ao buscar pessoa:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar a pessoa.",
    });
  }
});

router.post("/pessoas", async (req, res) => {
  try {
    const data = await withClient((client) => GestaoPessoaDAO.criar(client, req.body || {}));

    return res.status(201).json({
      success: true,
      message: "Pessoa cadastrada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[gestao:pessoa] Falha ao criar pessoa:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cadastrar a pessoa.",
    });
  }
});

router.put("/pessoas/:id", async (req, res) => {
  try {
    const data = await withClient(
      (client) => GestaoPessoaDAO.atualizar(client, Number(req.params.id), req.body || {})
    );

    return res.json({
      success: true,
      message: "Pessoa atualizada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[gestao:pessoa] Falha ao atualizar pessoa:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível atualizar a pessoa.",
    });
  }
});

router.delete("/pessoas/:id", async (req, res) => {
  try {
    await withClient((client) => GestaoPessoaDAO.excluir(client, Number(req.params.id)));

    return res.json({
      success: true,
      message: "Pessoa inativada com sucesso.",
    });
  } catch (error) {
    console.error("[gestao:pessoa] Falha ao inativar pessoa:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível inativar a pessoa.",
    });
  }
});

export default router;
