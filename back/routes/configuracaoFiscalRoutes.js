import express from "express";
import ConfiguracaoFiscalDAO from "../model/configuracaoFiscalDAO.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const data = await ConfiguracaoFiscalDAO.buscar(req.db);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[configuracao-fiscal] Falha ao carregar configuracao:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar a configuração fiscal da filial.",
    });
  }
});

router.get("/pessoas-select", async (req, res) => {
  try {
    const data = await ConfiguracaoFiscalDAO.listarPessoasSelect(req.db, {
      search: String(req.query.search || ""),
      limit: Number(req.query.limit || 20),
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[configuracao-fiscal] Falha ao pesquisar pessoas:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível pesquisar as pessoas.",
    });
  }
});

router.put("/", async (req, res) => {
  try {
    const data = await ConfiguracaoFiscalDAO.salvar(req.db, req.body || {});

    return res.json({
      success: true,
      message: "Configuração fiscal da filial salva com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[configuracao-fiscal] Falha ao salvar configuracao:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível salvar a configuração fiscal.",
    });
  }
});

export default router;
