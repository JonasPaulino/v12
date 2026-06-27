import express from "express";
import EstoqueDAO from "../model/estoqueDAO.js";

const router = express.Router();

const parseSort = (value) => {
  try {
    return value ? JSON.parse(String(value)) : {};
  } catch {
    return {};
  }
};

router.get("/saldos", async (req, res) => {
  try {
    const result = await EstoqueDAO.listarSaldos(req.db, {
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      search: String(req.query.search || ""),
      sort: parseSort(req.query.sort),
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[estoque] Falha ao listar saldos:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar os saldos de estoque.",
    });
  }
});

router.get("/movimentacoes", async (req, res) => {
  try {
    const result = await EstoqueDAO.listarMovimentacoes(req.db, {
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      search: String(req.query.search || ""),
      sort: parseSort(req.query.sort),
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[estoque] Falha ao listar movimentações:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar as movimentações de estoque.",
    });
  }
});

router.get("/produtos-select", async (req, res) => {
  try {
    const data = await EstoqueDAO.listarProdutosSelect(req.db, {
      search: String(req.query.search || ""),
      limit: Number(req.query.limit || 20),
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[estoque] Falha ao pesquisar produtos:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível pesquisar os produtos do estoque.",
    });
  }
});

router.post("/ajustes", async (req, res) => {
  try {
    const data = await EstoqueDAO.registrarAjuste(
      req.db,
      req.body || {},
      Number(req.user?.userId) || null
    );

    return res.status(201).json({
      success: true,
      message: "Ajuste de estoque registrado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[estoque] Falha ao registrar ajuste:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível registrar o ajuste de estoque.",
    });
  }
});

export default router;
