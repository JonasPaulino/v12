import express from "express";
import EntradaMercadoriaDAO from "../model/entradaMercadoriaDAO.js";

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
    const result = await EntradaMercadoriaDAO.listar(req.db, {
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
    console.error("[entrada-mercadoria] Falha ao listar entradas:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar as entradas de mercadoria.",
    });
  }
});

router.get("/pedidos-compra-select", async (req, res) => {
  try {
    const data = await EntradaMercadoriaDAO.listarPedidosCompraSelect(req.db, {
      search: String(req.query.search || ""),
      limit: Number(req.query.limit || 20),
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[entrada-mercadoria] Falha ao pesquisar pedidos:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível pesquisar pedidos de compra.",
    });
  }
});

router.get("/pedido-compra/:id", async (req, res) => {
  try {
    const data = await EntradaMercadoriaDAO.buscarPedidoCompra(req.db, Number(req.params.id));
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Pedido de compra não encontrado.",
      });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[entrada-mercadoria] Falha ao buscar pedido:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível buscar o pedido de compra.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const data = await EntradaMercadoriaDAO.buscarPorId(req.db, Number(req.params.id));
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Entrada de mercadoria não encontrada.",
      });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[entrada-mercadoria] Falha ao buscar entrada:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível buscar a entrada de mercadoria.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = await EntradaMercadoriaDAO.criar(req.db, {
      payload: req.body || {},
      usuarioId: Number(req.user?.userId) || null,
    });

    return res.status(201).json({
      success: true,
      message: "Entrada de mercadoria registrada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[entrada-mercadoria] Falha ao registrar entrada:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível registrar a entrada de mercadoria.",
    });
  }
});

export default router;
