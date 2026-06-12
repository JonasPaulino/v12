import express from "express";
import FinanceiroDAO from "../model/financeiroDAO.js";

const router = express.Router();

router.get("/support-data", async (req, res) => {
  try {
    const data = await FinanceiroDAO.obterSupportData(req.db, {
      tipo: String(req.query.tipo || "receber"),
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao carregar dados de apoio:", error);
    return res.status(500).json({
      success: false,
      message: "Nao foi possivel carregar os dados auxiliares do financeiro.",
    });
  }
});

router.get("/pessoas-select", async (req, res) => {
  try {
    const data = await FinanceiroDAO.listarPessoasSelect(req.db, {
      search: String(req.query.search || ""),
      limit: Number(req.query.limit || 20),
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao pesquisar pessoas:", error);
    return res.status(500).json({
      success: false,
      message: "Nao foi possivel pesquisar as pessoas.",
    });
  }
});

router.get("/listar", async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const search = String(req.query.search || "");
    const tipo = String(req.query.tipo || "");
    const status = String(req.query.status || "");
    let sort = {};

    try {
      sort = req.query.sort ? JSON.parse(String(req.query.sort)) : {};
    } catch {
      sort = {};
    }

    const result = await FinanceiroDAO.listar(req.db, {
      page,
      limit,
      search,
      tipo,
      status,
      sort,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao listar titulos:", error);
    return res.status(500).json({
      success: false,
      message: "Nao foi possivel listar os titulos financeiros.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const data = await FinanceiroDAO.buscarPorId(req.db, Number(req.params.id));

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Titulo financeiro nao encontrado.",
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao buscar titulo:", error);
    return res.status(500).json({
      success: false,
      message: "Nao foi possivel carregar o titulo financeiro.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = await FinanceiroDAO.criarManual(req.db, {
      payload: req.body || {},
    });

    return res.status(201).json({
      success: true,
      message: "Titulo financeiro cadastrado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao criar titulo:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Nao foi possivel cadastrar o titulo financeiro.",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const data = await FinanceiroDAO.atualizarManual(req.db, {
      financeiroTituloId: Number(req.params.id),
      payload: req.body || {},
    });

    return res.json({
      success: true,
      message: "Titulo financeiro atualizado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao atualizar titulo:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Nao foi possivel atualizar o titulo financeiro.",
    });
  }
});

export default router;
