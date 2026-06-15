import express from "express";
import VendaDAO from "../model/vendaDAO.js";

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

    const result = await VendaDAO.listar(req.db, {
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
    console.error("[venda] Falha ao listar pedidos:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar os pedidos de venda.",
    });
  }
});

router.get("/support-data", async (req, res) => {
  try {
    const data = await VendaDAO.obterSupportData(req.db);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[venda] Falha ao carregar dados de apoio:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar os dados auxiliares da venda.",
    });
  }
});

router.get("/pessoas-select", async (req, res) => {
  try {
    const data = await VendaDAO.listarPessoasSelect(req.db, {
      search: String(req.query.search || ""),
      limit: Number(req.query.limit || 20),
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[venda] Falha ao pesquisar clientes:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível pesquisar os clientes.",
    });
  }
});

router.get("/produtos-select", async (req, res) => {
  try {
    const data = await VendaDAO.listarProdutosSelect(req.db, {
      search: String(req.query.search || ""),
      limit: Number(req.query.limit || 20),
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[venda] Falha ao pesquisar produtos:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível pesquisar os produtos.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const data = await VendaDAO.buscarPorId(req.db, Number(req.params.id));

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Pedido de venda não encontrado.",
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[venda] Falha ao buscar pedido:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar o pedido de venda.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = await VendaDAO.criar(req.db, {
      payload: req.body || {},
      usuarioId: Number(req.user?.userId) || null,
    });

    return res.status(201).json({
      success: true,
      message: "Pedido de venda cadastrado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[venda] Falha ao criar pedido:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cadastrar o pedido de venda.",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const data = await VendaDAO.atualizar(req.db, {
      pedidoVendaId: Number(req.params.id),
      payload: req.body || {},
      usuarioId: Number(req.user?.userId) || null,
    });

    return res.json({
      success: true,
      message: "Pedido de venda atualizado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[venda] Falha ao atualizar pedido:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível atualizar o pedido de venda.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await VendaDAO.excluir(req.db, Number(req.params.id));

    return res.json({
      success: true,
      message: "Pedido de venda removido com sucesso.",
    });
  } catch (error) {
    console.error("[venda] Falha ao remover pedido:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível remover o pedido de venda.",
    });
  }
});

export default router;
