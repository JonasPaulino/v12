import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "../config/conexao.js";
import ChatDAO from "../model/chatDAO.js";

const router = express.Router();

const withClient = async (handler) => {
  const client = await pool.connect();
  try {
    return await handler(client);
  } finally {
    client.release();
  }
};

const getOptionalUser = (req) => {
  const token = req.cookies?.token;
  if (!token) return null;

  try {
    return jwt.verify(token, process.env.CHAVE_TOKEN);
  } catch {
    return null;
  }
};

router.get("/config", async (_req, res) => {
  try {
    const data = await withClient(async (client) => ({
      configuracao: await ChatDAO.buscarConfiguracao(client),
      categorias: await ChatDAO.listarCategorias(client, { somenteAtivas: true }),
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[chat] Falha ao buscar configuração:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar o chat.",
    });
  }
});

router.post("/atendimentos", async (req, res) => {
  try {
    const data = await withClient((client) =>
      ChatDAO.criarAtendimento(client, req.body || {}, getOptionalUser(req))
    );

    return res.json({
      success: true,
      message: "Atendimento iniciado.",
      data,
    });
  } catch (error) {
    console.error("[chat] Falha ao criar atendimento:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível iniciar o atendimento.",
    });
  }
});

router.get("/atendimentos/:token", async (req, res) => {
  try {
    const data = await withClient((client) =>
      ChatDAO.buscarAtendimentoPublico(client, req.params.token)
    );

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message || "Atendimento não encontrado.",
    });
  }
});

router.post("/atendimentos/:token/mensagens", async (req, res) => {
  try {
    const data = await withClient((client) =>
      ChatDAO.enviarMensagemCliente(
        client,
        req.params.token,
        req.body?.conteudo,
        getOptionalUser(req)
      )
    );

    return res.json({
      success: true,
      message: "Mensagem enviada.",
      data,
    });
  } catch (error) {
    console.error("[chat] Falha ao enviar mensagem do cliente:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível enviar a mensagem.",
    });
  }
});

router.post("/atendimentos/:token/avaliacao", async (req, res) => {
  try {
    const data = await withClient((client) =>
      ChatDAO.avaliarAtendimento(client, req.params.token, req.body || {})
    );

    return res.json({
      success: true,
      message: "Avaliação registrada.",
      data,
    });
  } catch (error) {
    console.error("[chat] Falha ao avaliar atendimento:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível avaliar o atendimento.",
    });
  }
});

export default router;
