import express from "express";
import QRCode from "qrcode";
import { evolutionClient } from "../config/evolutionClient.js";
import { env } from "../config/env.js";
import verifyServiceToken from "../middleware/serviceToken.js";
import { normalizePhoneNumber } from "../utils/phone.js";

const router = express.Router();

router.use(verifyServiceToken);

const encode = (value) => encodeURIComponent(String(value || "").trim());

const pick = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const looksLikeBase64Image = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.length < 120) return false;

  return /^[A-Za-z0-9+/=\r\n]+$/.test(normalized);
};

const summarizeValue = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return { present: false, length: 0 };

  return {
    present: true,
    length: normalized.length,
    startsWith: normalized.slice(0, 32),
    isDataImage: normalized.startsWith("data:image/"),
    isUrl: /^https?:\/\//i.test(normalized),
    looksLikeBase64Image: looksLikeBase64Image(normalized),
  };
};

const summarizeEvolutionPayload = (payload = {}) => ({
  keys: Object.keys(payload || {}),
  state: normalizeState(payload),
  instance: payload?.instance
    ? {
        keys: Object.keys(payload.instance || {}),
        state: normalizeState(payload.instance),
      }
    : null,
  qrcode: summarizeValue(payload?.qrcode || payload?.qrCode || payload?.qr),
  code: summarizeValue(payload?.code),
  image: summarizeValue(payload?.image || payload?.base64 || payload?.imageUrl || payload?.image_url),
  pairingCode: summarizeValue(payload?.pairingCode || payload?.codePairing),
});

const normalizeState = (payload) => {
  const raw = String(
    pick(
      payload?.state,
      payload?.connection,
      payload?.status,
      payload?.instance?.state,
      payload?.instance?.status,
      payload?.data?.state,
      payload?.data?.connection,
      payload?.result?.state
    ) || ""
  ).toLowerCase();

  if (/open|connected|online|session_connected|logged/.test(raw)) return "open";
  if (/close|closed|disconnected|offline|logout/.test(raw)) return "close";
  if (/qr|pair|scan|connecting|pending|pairing/.test(raw)) return "connecting";
  if (raw === "not_found") return "not_found";

  return "unknown";
};

router.post("/whatsapp/send-text", async (req, res) => {
  try {
    const instanceName = String(
      req.body?.instanceName || req.body?.instance || env.evolutionDefaultInstance
    ).trim();
    const toNumber = normalizePhoneNumber(req.body?.toNumber || req.body?.to);
    const text = String(req.body?.text || "").trim();

    if (!instanceName) {
      return res.status(400).json({
        success: false,
        message: "Nome da instância obrigatório.",
      });
    }

    if (!toNumber) {
      return res.status(400).json({
        success: false,
        message: "Número de destino inválido.",
      });
    }

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Texto da mensagem obrigatório.",
      });
    }

    const { data } = await evolutionClient.post(
      `/message/sendText/${encode(instanceName)}`,
      {
        number: toNumber,
        text,
      }
    );

    return res.json({
      success: true,
      message: "Mensagem enviada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[message] Falha ao enviar texto:", error?.response?.data || error?.message || error);
    return res.status(400).json({
      success: false,
      message:
        error?.response?.data?.message ||
        error?.message ||
        "Não foi possível enviar a mensagem no WhatsApp.",
    });
  }
});

router.post("/whatsapp/instance", async (req, res) => {
  try {
    const instanceName = String(req.body?.instanceName || "").trim();
    const number = String(req.body?.number || "").trim();

    if (!instanceName) {
      return res.status(400).json({
        success: false,
        message: "Nome da instância obrigatório.",
      });
    }

    const payload = {
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      number: number || undefined,
    };

    try {
      console.log("[message:evolution] Criando instância", {
        instanceName,
        hasNumber: !!number,
        baseURL: env.evolutionApiBaseUrl,
      });
      const { data } = await evolutionClient.post("/instance/create", payload);
      console.log("[message:evolution] Instância criada", {
        instanceName,
        response: summarizeEvolutionPayload(data?.data || data || {}),
      });

      return res.json({
        success: true,
        message: "Instância criada com sucesso.",
        data,
      });
    } catch (error) {
      const status = error?.response?.status;
      const message = String(error?.response?.data?.message || error?.message || "");

      if (status === 409 || /exist/i.test(message)) {
        return res.json({
          success: true,
          message: "Instância já existente.",
          data: { instanceName },
        });
      }

      throw error;
    }
  } catch (error) {
    console.error("[message] Falha ao criar instância:", error?.response?.data || error?.message || error);
    return res.status(400).json({
      success: false,
      message:
        error?.response?.data?.message ||
        error?.message ||
        "Não foi possível criar a instância do WhatsApp.",
    });
  }
});

router.get("/whatsapp/instance/:instanceName/status", async (req, res) => {
  try {
    const { data } = await evolutionClient.get(
      `/instance/connectionState/${encode(req.params.instanceName)}`
    );
    console.log("[message:evolution] Status da instância", {
      instanceName: req.params.instanceName,
      state: normalizeState(data),
      rawKeys: Object.keys(data || {}),
    });

    return res.json({
      success: true,
      data: {
        state: normalizeState(data),
        raw: data,
      },
    });
  } catch (error) {
    const status = error?.response?.status;
    if (status === 404 || status === 400) {
      return res.json({
        success: true,
        data: {
          state: "not_found",
          raw: error?.response?.data || null,
        },
      });
    }

    console.error("[message] Falha ao consultar status:", error?.response?.data || error?.message || error);
    return res.status(400).json({
      success: false,
      message:
        error?.response?.data?.message ||
        error?.message ||
        "Não foi possível consultar o status da instância.",
    });
  }
});

router.get("/whatsapp/instance/:instanceName/qrcode", async (req, res) => {
  try {
    const { data } = await evolutionClient.get(
      `/instance/connect/${encode(req.params.instanceName)}`
    );

    const payload = data?.data || data || {};
    console.log("[message:evolution] Retorno connect/qrcode", {
      instanceName: req.params.instanceName,
      response: summarizeEvolutionPayload(payload),
    });
    const rawCode = pick(
      payload.qrcode,
      payload.qrCode,
      payload.qr,
      payload.code
    );

    let image = null;
    const candidate = String(
      pick(payload.image, payload.base64, payload.imageUrl, payload.image_url) || ""
    );

    if (candidate.startsWith("data:image/")) {
      image = candidate;
    } else if (/^https?:\/\//i.test(candidate)) {
      image = candidate;
    } else if (looksLikeBase64Image(candidate)) {
      image = `data:image/png;base64,${candidate.replace(/\s+/g, "")}`;
    } else if (rawCode) {
      image = await QRCode.toDataURL(String(rawCode), {
        errorCorrectionLevel: "M",
        margin: 2,
        scale: 6,
      });
    }

    return res.json({
      success: true,
      data: {
        image,
        code: null,
        pairingCode: payload.pairingCode || payload.codePairing || null,
      },
    });
  } catch (error) {
    console.error("[message] Falha ao obter QR code:", error?.response?.data || error?.message || error);
    return res.status(400).json({
      success: false,
      message:
        error?.response?.data?.message ||
        error?.message ||
        "Não foi possível obter o QR Code da instância.",
    });
  }
});

router.put("/whatsapp/instance/:instanceName/restart", async (req, res) => {
  try {
    const { data } = await evolutionClient.put(
      `/instance/restart/${encode(req.params.instanceName)}`
    );

    return res.json({
      success: true,
      message: "Instância reiniciada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[message] Falha ao reiniciar instância:", error?.response?.data || error?.message || error);
    return res.status(400).json({
      success: false,
      message:
        error?.response?.data?.message ||
        error?.message ||
        "Não foi possível reiniciar a instância.",
    });
  }
});

router.delete("/whatsapp/instance/:instanceName/logout", async (req, res) => {
  try {
    const { data } = await evolutionClient.delete(
      `/instance/logout/${encode(req.params.instanceName)}`
    );

    return res.json({
      success: true,
      message: "Instância desconectada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[message] Falha ao desconectar instância:", error?.response?.data || error?.message || error);
    return res.status(400).json({
      success: false,
      message:
        error?.response?.data?.message ||
        error?.message ||
        "Não foi possível desconectar a instância.",
    });
  }
});

router.delete("/whatsapp/instance/:instanceName", async (req, res) => {
  try {
    const { data } = await evolutionClient.delete(
      `/instance/delete/${encode(req.params.instanceName)}`
    );

    return res.json({
      success: true,
      message: "Instância removida com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[message] Falha ao excluir instância:", error?.response?.data || error?.message || error);
    return res.status(400).json({
      success: false,
      message:
        error?.response?.data?.message ||
        error?.message ||
        "Não foi possível excluir a instância.",
    });
  }
});

export default router;
