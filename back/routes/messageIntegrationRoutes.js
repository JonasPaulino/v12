import express from "express";
import MensagemDAO from "../model/mensagemDAO.js";
import {
  criarInstanciaWhatsApp,
  desconectarInstanciaWhatsApp,
  excluirInstanciaWhatsApp,
  obterQrCodeWhatsApp,
  obterStatusWhatsApp,
  reiniciarInstanciaWhatsApp,
} from "../services/messageGatewayService.js";

const router = express.Router();

const getTenantConfig = async (client, overrides = {}) => {
  const config = await MensagemDAO.buscarConfiguracaoWhatsApp(client);
  const instanceName = String(
    overrides.instance_name || overrides.instanceName || config.instance_name || ""
  ).trim();
  const remetenteNumero = String(
    overrides.remetente_numero || overrides.remetenteNumero || config.remetente_numero || ""
  ).trim();

  if (!instanceName) {
    throw new Error("Informe o nome da instância do WhatsApp antes de gerenciar a conexão.");
  }

  return {
    ...config,
    instance_name: instanceName,
    remetente_numero: remetenteNumero,
  };
};

router.get("/whatsapp/status", async (req, res) => {
  try {
    const config = await getTenantConfig(req.db, req.query || {});
    const data = await obterStatusWhatsApp(config.instance_name);

    return res.json({
      success: true,
      data: data?.data || null,
    });
  } catch (error) {
    console.error("[mensagens] Falha ao consultar status do WhatsApp:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível consultar o status do WhatsApp.",
    });
  }
});

router.get("/whatsapp/qrcode", async (req, res) => {
  try {
    const config = await getTenantConfig(req.db, req.query || {});
    const data = await obterQrCodeWhatsApp(config.instance_name);

    return res.json({
      success: true,
      data: data?.data || null,
    });
  } catch (error) {
    console.error("[mensagens] Falha ao obter QR Code do WhatsApp:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível obter o QR Code do WhatsApp.",
    });
  }
});

router.post("/whatsapp/instance", async (req, res) => {
  try {
    const config = await getTenantConfig(req.db, req.body || {});
    const data = await criarInstanciaWhatsApp({
      instanceName: config.instance_name,
      number: config.remetente_numero,
    });

    return res.json({
      success: true,
      message: data?.message || "Instância criada com sucesso.",
      data: data?.data || null,
    });
  } catch (error) {
    console.error("[mensagens] Falha ao criar instância do WhatsApp:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível criar a instância do WhatsApp.",
    });
  }
});

router.put("/whatsapp/restart", async (req, res) => {
  try {
    const config = await getTenantConfig(req.db, req.body || {});
    const data = await reiniciarInstanciaWhatsApp(config.instance_name);

    return res.json({
      success: true,
      message: data?.message || "Instância reiniciada com sucesso.",
      data: data?.data || null,
    });
  } catch (error) {
    console.error("[mensagens] Falha ao reiniciar instância do WhatsApp:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível reiniciar a instância do WhatsApp.",
    });
  }
});

router.delete("/whatsapp/logout", async (req, res) => {
  try {
    const config = await getTenantConfig(req.db, req.body || req.query || {});
    const data = await desconectarInstanciaWhatsApp(config.instance_name);

    return res.json({
      success: true,
      message: data?.message || "Instância desconectada com sucesso.",
      data: data?.data || null,
    });
  } catch (error) {
    console.error("[mensagens] Falha ao desconectar instância do WhatsApp:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível desconectar a instância do WhatsApp.",
    });
  }
});

router.delete("/whatsapp/instance", async (req, res) => {
  try {
    const config = await getTenantConfig(req.db, req.body || req.query || {});
    const data = await excluirInstanciaWhatsApp(config.instance_name);

    return res.json({
      success: true,
      message: data?.message || "Instância excluída com sucesso.",
      data: data?.data || null,
    });
  } catch (error) {
    console.error("[mensagens] Falha ao excluir instância do WhatsApp:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível excluir a instância do WhatsApp.",
    });
  }
});

export default router;
