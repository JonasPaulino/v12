import express from "express";
import CompraDAO from "../model/compraDAO.js";

const router = express.Router();

const parseSort = (value) => {
  try {
    return value ? JSON.parse(String(value)) : {};
  } catch {
    return {};
  }
};

router.get("/", async (req, res) => {
  try {
    const result = await CompraDAO.listar(req.db, {
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
    console.error("[compras] Falha ao listar pedidos:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar os pedidos de compra.",
    });
  }
});

router.get("/support", async (req, res) => {
  try {
    const data = await CompraDAO.obterSupportData(req.db);
    return res.json({ success: true, data });
  } catch (error) {
    console.error("[compras] Falha ao carregar suporte:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar os dados de suporte.",
    });
  }
});

router.get("/fornecedores-select", async (req, res) => {
  try {
    const data = await CompraDAO.listarFornecedoresSelect(req.db, {
      search: String(req.query.search || ""),
      limit: Number(req.query.limit || 20),
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[compras] Falha ao pesquisar fornecedores:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível pesquisar fornecedores.",
    });
  }
});

router.get("/produtos-select", async (req, res) => {
  try {
    const data = await CompraDAO.listarProdutosSelect(req.db, {
      search: String(req.query.search || ""),
      limit: Number(req.query.limit || 20),
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[compras] Falha ao pesquisar produtos:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível pesquisar produtos.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const data = await CompraDAO.buscarPorId(req.db, Number(req.params.id));
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Pedido de compra não encontrado.",
      });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[compras] Falha ao buscar pedido:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível buscar o pedido de compra.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = await CompraDAO.salvar(req.db, {
      payload: req.body || {},
      usuarioId: Number(req.user?.userId) || null,
    });

    return res.status(201).json({
      success: true,
      message: "Pedido de compra cadastrado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[compras] Falha ao cadastrar pedido:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cadastrar o pedido de compra.",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const data = await CompraDAO.salvar(req.db, {
      pedidoCompraId: Number(req.params.id),
      payload: req.body || {},
      usuarioId: Number(req.user?.userId) || null,
    });

    return res.json({
      success: true,
      message: "Pedido de compra atualizado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[compras] Falha ao atualizar pedido:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível atualizar o pedido de compra.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const data = await CompraDAO.cancelar(req.db, Number(req.params.id));
    return res.json({
      success: true,
      message: "Pedido de compra cancelado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[compras] Falha ao cancelar pedido:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cancelar o pedido de compra.",
    });
  }
});

export default router;
