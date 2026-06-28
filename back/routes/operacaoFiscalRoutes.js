import express from "express";
import OperacaoFiscalDAO from "../model/operacaoFiscalDAO.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const data = await OperacaoFiscalDAO.listar(req.db, {
      search: String(req.query.search || ""),
      includeInactive: String(req.query.includeInactive || "true") !== "false",
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[operacao-fiscal] Falha ao listar operações fiscais:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar as operações fiscais.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const data = await OperacaoFiscalDAO.buscarPorId(req.db, Number(req.params.id));
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Operação fiscal não encontrada.",
      });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[operacao-fiscal] Falha ao buscar operação fiscal:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar a operação fiscal.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = await OperacaoFiscalDAO.criar(req.db, req.body || {});
    return res.status(201).json({
      success: true,
      message: "Operação fiscal cadastrada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[operacao-fiscal] Falha ao criar operação fiscal:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cadastrar a operação fiscal.",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const data = await OperacaoFiscalDAO.atualizar(req.db, Number(req.params.id), req.body || {});
    return res.json({
      success: true,
      message: "Operação fiscal atualizada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[operacao-fiscal] Falha ao atualizar operação fiscal:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível atualizar a operação fiscal.",
    });
  }
});

export default router;
