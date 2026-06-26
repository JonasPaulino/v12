import express from "express";
import RegraFiscalDAO from "../model/regraFiscalDAO.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const data = await RegraFiscalDAO.listar(req.db, {
      search: String(req.query.search || ""),
      includeInactive: String(req.query.includeInactive || "true") !== "false",
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[regra-fiscal] Falha ao listar regras fiscais:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar as regras fiscais.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const data = await RegraFiscalDAO.buscarPorId(req.db, Number(req.params.id));
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Regra fiscal não encontrada.",
      });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[regra-fiscal] Falha ao buscar regra fiscal:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar a regra fiscal.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = await RegraFiscalDAO.criar(req.db, req.body || {});
    return res.status(201).json({
      success: true,
      message: "Regra fiscal cadastrada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[regra-fiscal] Falha ao criar regra fiscal:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cadastrar a regra fiscal.",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const data = await RegraFiscalDAO.atualizar(req.db, Number(req.params.id), req.body || {});
    return res.json({
      success: true,
      message: "Regra fiscal atualizada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[regra-fiscal] Falha ao atualizar regra fiscal:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível atualizar a regra fiscal.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await RegraFiscalDAO.excluir(req.db, Number(req.params.id));
    return res.json({
      success: true,
      message: "Regra fiscal removida com sucesso.",
    });
  } catch (error) {
    console.error("[regra-fiscal] Falha ao excluir regra fiscal:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível remover a regra fiscal.",
    });
  }
});

export default router;
