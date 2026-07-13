import express from "express";
import PdvDAO from "../model/pdvDAO.js";

const router = express.Router();

router.get("/vendas", async (req, res) => {
  try {
    const data = await PdvDAO.listarVendas(req.db, {
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      search: req.query.search || "",
      status: req.query.status || "",
    });

    return res.json({ success: true, ...data });
  } catch (error) {
    console.error("[pdv] Falha ao listar vendas:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar as vendas do PDV.",
    });
  }
});

router.get("/vendas/:id", async (req, res) => {
  try {
    const data = await PdvDAO.obterVenda(req.db, Number(req.params.id));
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Venda do PDV não encontrada.",
      });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[pdv] Falha ao consultar venda:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível consultar a venda do PDV.",
    });
  }
});

router.get("/caixas", async (req, res) => {
  try {
    const data = await PdvDAO.listarCaixas(req.db, {
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      search: req.query.search || "",
      status: req.query.status || "",
    });

    return res.json({ success: true, ...data });
  } catch (error) {
    console.error("[pdv] Falha ao listar caixas:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar os caixas do PDV.",
    });
  }
});

router.get("/caixas/:id", async (req, res) => {
  try {
    const data = await PdvDAO.obterCaixa(req.db, Number(req.params.id));
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Caixa do PDV não encontrado.",
      });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[pdv] Falha ao consultar caixa:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível consultar o caixa do PDV.",
    });
  }
});

export default router;
