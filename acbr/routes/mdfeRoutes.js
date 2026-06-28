import express from "express";
import {
  AcbrLibMdfeIntegrationError,
  AcbrLibMdfeNotConfiguredError,
  AcbrLibMdfeProvider,
} from "../providers/acbrlib/mdfeClient.js";

const router = express.Router();

const isProviderError = (error) =>
  error instanceof AcbrLibMdfeNotConfiguredError ||
  error instanceof AcbrLibMdfeIntegrationError;

const buildProcessarMdfeMessage = (data = {}) => {
  if (data.mappedStatus === "autorizado") {
    return data.xMotivo || "MDF-e autorizado pela SEFAZ.";
  }

  if (data.mappedStatus === "validado") {
    return data.xMotivo || "MDF-e enviado e aguardando processamento da SEFAZ.";
  }

  return data.xMotivo || "MDF-e rejeitado pela SEFAZ.";
};

router.get("/diagnostico", async (_req, res) => {
  try {
    return res.json({
      success: true,
      data: AcbrLibMdfeProvider.diagnostics(),
    });
  } catch (error) {
    console.error("[acbr:mdfe] Falha ao carregar diagnóstico:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar o diagnóstico da ACBrLibMDFe.",
    });
  }
});

router.post("/status-servico", async (req, res) => {
  try {
    const data = await AcbrLibMdfeProvider.consultarStatusServico({
      client: req.db,
      tenantId: Number(req.user?.tenantId),
      userId: Number(req.user?.userId) || null,
    });

    return res.json({
      success: true,
      message: "Status do serviço MDF-e consultado pela ACBrLibMDFe.",
      data,
    });
  } catch (error) {
    if (isProviderError(error)) {
      if (error instanceof AcbrLibMdfeIntegrationError) {
        console.error("[acbr:mdfe] Falha de integração ACBrLibMDFe:", {
          message: error.message,
          details: error.details,
        });
      }

      return res.status(error instanceof AcbrLibMdfeNotConfiguredError ? 501 : 400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("[acbr:mdfe] Falha ao consultar status:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível consultar o status do serviço MDF-e.",
    });
  }
});

router.post("/:id/processar", async (req, res) => {
  try {
    const data = await AcbrLibMdfeProvider.emitirMdfe({
      client: req.db,
      mdfeId: Number(req.params.id),
      tenantId: Number(req.user?.tenantId),
      userId: Number(req.user?.userId) || null,
    });

    return res.json({
      success: !!data.success,
      message: buildProcessarMdfeMessage(data),
      data,
    });
  } catch (error) {
    if (isProviderError(error)) {
      if (error instanceof AcbrLibMdfeIntegrationError) {
        console.error("[acbr:mdfe] Falha de integração ACBrLibMDFe:", {
          message: error.message,
          details: error.details,
        });
      }

      return res.status(error instanceof AcbrLibMdfeNotConfiguredError ? 501 : 400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("[acbr:mdfe] Falha ao processar emissão:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível processar a emissão do MDF-e.",
    });
  }
});

export default router;
