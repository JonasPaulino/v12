import express from "express";
import { pool } from "../config/conexao.js";
import GestaoMensagemDAO from "../model/gestaoMensagemDAO.js";
import {
  criarInstanciaWhatsApp,
  desconectarInstanciaWhatsApp,
  excluirInstanciaWhatsApp,
  obterQrCodeWhatsApp,
  obterStatusWhatsApp,
  reiniciarInstanciaWhatsApp,
} from "../services/messageGatewayService.js";

const router = express.Router();

const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "sim", "yes"].includes(normalized)) return true;
  if (["false", "0", "nao", "não", "no"].includes(normalized)) return false;

  return defaultValue;
};

const withClient = async (handler) => {
  const client = await pool.connect();
  try {
    return await handler(client);
  } finally {
    client.release();
  }
};

const getConfig = async (client, overrides = {}) => {
  const config = await GestaoMensagemDAO.buscarConfiguracaoWhatsApp(client);
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

const persistConnectionConfig = async (
  client,
  { instanceName, remetenteNumero, whatsappAtivo, usuarioId }
) => {
  const current = await GestaoMensagemDAO.buscarConfiguracaoWhatsApp(client);

  return GestaoMensagemDAO.salvarConfiguracaoWhatsApp(
    client,
    {
      ...current,
      whatsapp_ativo: whatsappAtivo,
      instance_name: instanceName ?? current.instance_name,
      remetente_numero: remetenteNumero ?? current.remetente_numero,
    },
    usuarioId
  );
};

router.get("/mensagens/whatsapp/configuracao", async (_req, res) => {
  try {
    const config = await withClient((client) =>
      GestaoMensagemDAO.buscarConfiguracaoWhatsApp(client)
    );

    return res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("[gestao:mensagens] Falha ao buscar configuração:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível buscar a configuração de mensagens da Gestão V12.",
    });
  }
});

router.put("/mensagens/whatsapp/configuracao", async (req, res) => {
  try {
    const config = await withClient((client) =>
      GestaoMensagemDAO.salvarConfiguracaoWhatsApp(
        client,
        req.body || {},
        Number(req.user?.userId) || null
      )
    );

    return res.json({
      success: true,
      message: "Configuração de mensagens da Gestão V12 salva com sucesso.",
      data: config,
    });
  } catch (error) {
    console.error("[gestao:mensagens] Falha ao salvar configuração:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível salvar a configuração de mensagens.",
    });
  }
});

router.get("/mensagens/whatsapp/status", async (req, res) => {
  try {
    const data = await withClient(async (client) => {
      const config = await getConfig(client, req.query || {});
      return obterStatusWhatsApp(config.instance_name);
    });

    return res.json({
      success: true,
      data: data?.data || null,
    });
  } catch (error) {
    console.error("[gestao:mensagens] Falha ao consultar status:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível consultar o status do WhatsApp.",
    });
  }
});

router.get("/mensagens/whatsapp/qrcode", async (req, res) => {
  try {
    const data = await withClient(async (client) => {
      const config = await getConfig(client, req.query || {});
      return obterQrCodeWhatsApp(config.instance_name);
    });

    return res.json({
      success: true,
      data: data?.data || null,
    });
  } catch (error) {
    console.error("[gestao:mensagens] Falha ao obter QR Code:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível obter o QR Code do WhatsApp.",
    });
  }
});

router.post("/mensagens/whatsapp/instance", async (req, res) => {
  let config = null;

  try {
    const result = await withClient(async (client) => {
      config = await getConfig(client, req.body || {});
      const whatsappAtivo = normalizeBoolean(req.body?.whatsapp_ativo, true);
      const data = await criarInstanciaWhatsApp({
        instanceName: config.instance_name,
        number: config.remetente_numero,
      });
      const savedConfig = await persistConnectionConfig(client, {
        instanceName: config.instance_name,
        remetenteNumero: config.remetente_numero,
        whatsappAtivo,
        usuarioId: Number(req.user?.userId) || null,
      });

      return { data, savedConfig };
    });

    return res.json({
      success: true,
      message: result.data?.message || "Instância criada com sucesso.",
      data: result.data?.data || null,
      config: result.savedConfig,
    });
  } catch (error) {
    const message = String(error?.message || error?.response?.data?.message || "");

    if (config && /exist/i.test(message)) {
      const result = await withClient(async (client) => {
        const whatsappAtivo = normalizeBoolean(req.body?.whatsapp_ativo, true);
        const savedConfig = await persistConnectionConfig(client, {
          instanceName: config.instance_name,
          remetenteNumero: config.remetente_numero,
          whatsappAtivo,
          usuarioId: Number(req.user?.userId) || null,
        });

        return { savedConfig };
      });

      return res.json({
        success: true,
        message: "Instância já existente.",
        data: { instanceName: config.instance_name },
        config: result.savedConfig,
      });
    }

    console.error("[gestao:mensagens] Falha ao criar instância:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível criar a instância do WhatsApp.",
    });
  }
});

router.put("/mensagens/whatsapp/restart", async (req, res) => {
  try {
    const data = await withClient(async (client) => {
      const config = await getConfig(client, req.body || {});
      return reiniciarInstanciaWhatsApp(config.instance_name);
    });

    return res.json({
      success: true,
      message: data?.message || "Instância reiniciada com sucesso.",
      data: data?.data || null,
    });
  } catch (error) {
    console.error("[gestao:mensagens] Falha ao reiniciar instância:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível reiniciar a instância.",
    });
  }
});

router.delete("/mensagens/whatsapp/logout", async (req, res) => {
  try {
    const result = await withClient(async (client) => {
      const config = await getConfig(client, req.body || req.query || {});
      const data = await desconectarInstanciaWhatsApp(config.instance_name);
      const savedConfig = await persistConnectionConfig(client, {
        instanceName: config.instance_name,
        remetenteNumero: config.remetente_numero,
        whatsappAtivo: false,
        usuarioId: Number(req.user?.userId) || null,
      });

      return { data, savedConfig };
    });

    return res.json({
      success: true,
      message: result.data?.message || "Instância desconectada com sucesso.",
      data: result.data?.data || null,
      config: result.savedConfig,
    });
  } catch (error) {
    console.error("[gestao:mensagens] Falha ao desconectar instância:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível desconectar a instância.",
    });
  }
});

router.delete("/mensagens/whatsapp/instance", async (req, res) => {
  try {
    const result = await withClient(async (client) => {
      const config = await getConfig(client, req.body || req.query || {});
      const data = await excluirInstanciaWhatsApp(config.instance_name);
      const savedConfig = await persistConnectionConfig(client, {
        instanceName: "",
        remetenteNumero: config.remetente_numero,
        whatsappAtivo: false,
        usuarioId: Number(req.user?.userId) || null,
      });

      return { data, savedConfig };
    });

    return res.json({
      success: true,
      message: result.data?.message || "Instância excluída com sucesso.",
      data: result.data?.data || null,
      config: result.savedConfig,
    });
  } catch (error) {
    console.error("[gestao:mensagens] Falha ao excluir instância:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível excluir a instância.",
    });
  }
});

export default router;
