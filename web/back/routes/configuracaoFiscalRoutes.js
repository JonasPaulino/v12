import express from "express";
import ConfiguracaoFiscalDAO from "../model/configuracaoFiscalDAO.js";
import loginDAO from "../model/loginDAO.js";
import usuarioDAO from "../model/usuarioDAO.js";

const router = express.Router();

router.use(async (req, res, next) => {
  try {
    const allowed = await usuarioDAO.usuarioPodeAdministrarFilial(req.db, {
      actorUserId: Number(req.user.userId),
      currentTenantId: Number(req.user.tenantId),
    });

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "Acesso restrito a administradores da filial.",
      });
    }

    return next();
  } catch (error) {
    console.error("[configuracao-fiscal] Falha ao validar permissao:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível validar a permissão do usuário.",
    });
  }
});

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
    const payload = { ...(req.body || {}) };
    const usuario = await loginDAO.buscarUsuarioPorId(req.db, req.user.userId);

    if (!usuario?.usuario_master) {
      delete payload.responsavel_tecnico;
    }

    const data = await ConfiguracaoFiscalDAO.salvar(req.db, payload);

    return res.json({
      success: true,
      message: "Configurações da filial salvas com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[configuracao-fiscal] Falha ao salvar configuracao:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível salvar as configurações da filial.",
    });
  }
});

export default router;
