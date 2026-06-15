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
      message: "Não foi possível carregar os dados auxiliares do financeiro.",
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
      message: "Não foi possível pesquisar as pessoas.",
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
      message: "Não foi possível listar os títulos financeiros.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const data = await FinanceiroDAO.buscarPorId(req.db, Number(req.params.id));

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Título financeiro não encontrado.",
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
      message: "Não foi possível carregar o título financeiro.",
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
      message: "Título financeiro cadastrado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao criar titulo:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cadastrar o título financeiro.",
    });
  }
});

router.post("/:id/baixas", async (req, res) => {
  try {
    const data = await FinanceiroDAO.registrarBaixa(req.db, {
      financeiroTituloId: Number(req.params.id),
      payload: req.body || {},
      actorUserId: Number(req.user?.userId) || null,
    });

    return res.json({
      success: true,
      message: "Baixa financeira registrada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao registrar baixa:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível registrar a baixa financeira.",
    });
  }
});

router.post("/baixas/:baixaId/estornar", async (req, res) => {
  try {
    const data = await FinanceiroDAO.estornarBaixa(req.db, {
      financeiroTituloBaixaId: Number(req.params.baixaId),
      actorUserId: Number(req.user?.userId) || null,
    });

    return res.json({
      success: true,
      message: "Baixa financeira estornada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao estornar baixa:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível estornar a baixa financeira.",
    });
  }
});

router.post("/:id/cancelar", async (req, res) => {
  try {
    await FinanceiroDAO.cancelarTitulo(req.db, {
      financeiroTituloId: Number(req.params.id),
    });

    return res.json({
      success: true,
      message: "Título financeiro cancelado com sucesso.",
    });
  } catch (error) {
    console.error("[financeiro] Falha ao cancelar título:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cancelar o título financeiro.",
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
      message: "Título financeiro atualizado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[financeiro] Falha ao atualizar titulo:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível atualizar o título financeiro.",
    });
  }
});

export default router;
