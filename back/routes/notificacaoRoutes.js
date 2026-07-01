import express from "express";
import NotificacaoDAO from "../model/notificacaoDAO.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await NotificacaoDAO.listar(req.db, {
      usuarioId: Number(req.user?.userId) || null,
      limit: Number(req.query.limit || 8),
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[notificacoes] Falha ao listar:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar as notificações.",
    });
  }
});

router.post("/:id/lida", async (req, res) => {
  try {
    const data = await NotificacaoDAO.marcarComoLida(req.db, Number(req.params.id), {
      usuarioId: Number(req.user?.userId) || null,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[notificacoes] Falha ao marcar como lida:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível atualizar a notificação.",
    });
  }
});

export default router;
