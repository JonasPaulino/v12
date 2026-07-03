import express from "express";
import { pool } from "../config/conexao.js";
import ChatDAO from "../model/chatDAO.js";
import { enviarNotificacoesChatPendentes } from "../services/chatNotificationService.js";

const router = express.Router();

const withClient = async (handler) => {
  const client = await pool.connect();
  try {
    return await handler(client);
  } finally {
    client.release();
  }
};

router.get("/chat/configuracao", async (req, res) => {
  try {
    const data = await withClient(async (client) => ({
      configuracao: await ChatDAO.buscarConfiguracao(client),
      categorias: await ChatDAO.listarCategorias(client),
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[gestao:chat] Falha ao buscar configuração:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar a configuração do chat.",
    });
  }
});

router.put("/chat/configuracao", async (req, res) => {
  try {
    const data = await withClient((client) =>
      ChatDAO.salvarConfiguracao(client, req.body || {}, req.user?.userId || null)
    );

    return res.json({
      success: true,
      message: "Configuração do chat salva.",
      data,
    });
  } catch (error) {
    console.error("[gestao:chat] Falha ao salvar configuração:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível salvar a configuração do chat.",
    });
  }
});

router.post("/chat/notificacoes/pendentes", async (_req, res) => {
  try {
    const result = await enviarNotificacoesChatPendentes();

    return res.json({
      success: true,
      message: result.enviados
        ? "Notificações do chat enviadas."
        : "Nenhuma notificação do chat para enviar.",
      data: result,
    });
  } catch (error) {
    console.error("[gestao:chat] Falha ao enviar notificações pendentes:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível enviar as notificações pendentes do chat.",
    });
  }
});

router.post("/chat/categorias", async (req, res) => {
  try {
    const data = await withClient((client) => ChatDAO.salvarCategoria(client, req.body || {}));

    return res.json({
      success: true,
      message: "Categoria salva.",
      data,
    });
  } catch (error) {
    console.error("[gestao:chat] Falha ao salvar categoria:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível salvar a categoria.",
    });
  }
});

router.get("/chat/atendimentos", async (req, res) => {
  try {
    const data = await withClient((client) =>
      ChatDAO.listarAtendimentosGestao(client, req.user.userId, {
        status: req.query.status,
        search: req.query.search,
      })
    );

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[gestao:chat] Falha ao listar atendimentos:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar os atendimentos.",
    });
  }
});

router.get("/chat/atendimentos/:id", async (req, res) => {
  try {
    const data = await withClient((client) =>
      ChatDAO.buscarAtendimentoGestao(client, req.user.userId, Number(req.params.id))
    );

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message || "Atendimento não encontrado.",
    });
  }
});

router.post("/chat/atendimentos/:id/mensagens", async (req, res) => {
  try {
    const data = await withClient((client) =>
      ChatDAO.responderGestao(client, req.user, Number(req.params.id), req.body?.conteudo)
    );

    return res.json({
      success: true,
      message: "Mensagem enviada.",
      data,
    });
  } catch (error) {
    console.error("[gestao:chat] Falha ao responder atendimento:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível enviar a mensagem.",
    });
  }
});

router.post("/chat/atendimentos/:id/transferir", async (req, res) => {
  try {
    const data = await withClient((client) =>
      ChatDAO.transferirGestao(
        client,
        req.user,
        Number(req.params.id),
        Number(req.body?.categoria_id),
        req.body?.motivo
      )
    );

    return res.json({
      success: true,
      message: "Atendimento transferido.",
      data,
    });
  } catch (error) {
    console.error("[gestao:chat] Falha ao transferir atendimento:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível transferir o atendimento.",
    });
  }
});

router.post("/chat/atendimentos/:id/encerrar", async (req, res) => {
  try {
    const data = await withClient((client) =>
      ChatDAO.encerrarGestao(client, req.user, Number(req.params.id))
    );

    return res.json({
      success: true,
      message: "Atendimento encerrado.",
      data,
    });
  } catch (error) {
    console.error("[gestao:chat] Falha ao encerrar atendimento:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível encerrar o atendimento.",
    });
  }
});

export default router;
