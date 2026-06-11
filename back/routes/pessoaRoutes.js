import express from "express";
import PessoaDAO from "../model/pessoaDAO.js";

const router = express.Router();

router.get("/listar", async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const search = String(req.query.search || "");
    let sort = {};

    try {
      sort = req.query.sort ? JSON.parse(String(req.query.sort)) : {};
    } catch {
      sort = {};
    }

    const result = await PessoaDAO.listar(req.db, {
      page,
      limit,
      search,
      sort,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[pessoa] Falha ao listar pessoas:", error);
    return res.status(500).json({
      success: false,
      message: "Nao foi possivel listar as pessoas.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const data = await PessoaDAO.buscarPorId(req.db, Number(req.params.id));

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Pessoa nao encontrada.",
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[pessoa] Falha ao buscar pessoa:", error);
    return res.status(500).json({
      success: false,
      message: "Nao foi possivel carregar a pessoa.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = await PessoaDAO.criar(req.db, req.body || {});

    return res.status(201).json({
      success: true,
      message: "Pessoa cadastrada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[pessoa] Falha ao criar pessoa:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Nao foi possivel cadastrar a pessoa.",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const data = await PessoaDAO.atualizar(req.db, Number(req.params.id), req.body || {});

    return res.json({
      success: true,
      message: "Pessoa atualizada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[pessoa] Falha ao atualizar pessoa:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Nao foi possivel atualizar a pessoa.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await PessoaDAO.excluir(req.db, Number(req.params.id));

    return res.json({
      success: true,
      message: "Pessoa removida com sucesso.",
    });
  } catch (error) {
    console.error("[pessoa] Falha ao remover pessoa:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Nao foi possivel remover a pessoa.",
    });
  }
});

export default router;
