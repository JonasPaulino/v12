import express from "express";
import NfeDAO from "../model/nfeDAO.js";
import {
  AcbrLibProvider,
  AcbrLibNotConfiguredError,
  AcbrLibIntegrationError,
} from "../providers/acbrlib/client.js";

const router = express.Router();

const isProviderStubError = (error) =>
  error instanceof AcbrLibNotConfiguredError || error instanceof AcbrLibIntegrationError;

const isFiscalValidationError = (error) =>
  /NF-e|Configuração|configuração|Certificado|Emitente|emitente|Destinatário|destinatário|Item|Preencha|Código IBGE|codigo IBGE|habilitada|filial|pedido|chave de acesso/i.test(
    String(error?.message || "")
  );

const extractXmlTag = (value, tagName) => {
  const text = String(value || "");
  const match = text.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1]?.trim() || "";
};

const isXmlLike = (value) => /<\?xml|<[^>]+>/i.test(String(value || ""));

const getFiscalMotivo = (data = {}) => {
  const motivo = data.xMotivo || extractXmlTag(data.raw, "xMotivo");
  if (motivo) return motivo;
  return isXmlLike(data.raw) ? "" : String(data.raw || "").trim();
};

const buildProcessarNfeMessage = (data = {}) => {
  const status = String(data.mappedStatus || "").toLowerCase();
  const motivo = getFiscalMotivo(data);

  if (status === "autorizada") return "NF-e autorizada pela SEFAZ.";
  if (status === "processando") return "NF-e enviada para a SEFAZ e aguardando processamento.";
  if (status === "rejeitada") {
    return motivo ? `NF-e rejeitada pela SEFAZ: ${motivo}` : "NF-e rejeitada pela SEFAZ.";
  }
  if (status === "denegada") {
    return motivo ? `NF-e denegada pela SEFAZ: ${motivo}` : "NF-e denegada pela SEFAZ.";
  }

  return motivo || "Emissão processada pela ACBrLib.";
};

const buildCancelarNfeMessage = (data = {}) => {
  const status = String(data.mappedStatus || "").toLowerCase();
  const motivo = getFiscalMotivo(data);

  if (status === "cancelada") {
    return motivo ? `NF-e cancelada pela SEFAZ: ${motivo}` : "NF-e cancelada pela SEFAZ.";
  }
  return motivo ? `Cancelamento não autorizado pela SEFAZ: ${motivo}` : "Cancelamento não autorizado pela SEFAZ.";
};

const buildConsultarNfeMessage = (data = {}) => {
  const status = String(data.mappedStatus || "").toLowerCase();
  const motivo = getFiscalMotivo(data);

  if (status === "autorizada") return motivo || "NF-e autorizada na SEFAZ.";
  if (status === "cancelada") return motivo || "NF-e cancelada na SEFAZ.";
  if (status === "denegada") return motivo || "NF-e denegada na SEFAZ.";
  return motivo ? `Consulta sem confirmação fiscal: ${motivo}` : "Consulta sem confirmação fiscal.";
};

const isConsultaFiscalConclusiva = (data = {}) =>
  ["autorizada", "cancelada", "denegada"].includes(
    String(data.mappedStatus || "").toLowerCase()
  );

const normalizeAccessKey = (value) => String(value || "").replace(/\D/g, "");

router.get("/listar", async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const search = String(req.query.search || "");
    const status = String(req.query.status || "");
    let sort = {};

    try {
      sort = req.query.sort ? JSON.parse(String(req.query.sort)) : {};
    } catch {
      sort = {};
    }

    const result = await NfeDAO.listar(req.db, {
      page,
      limit,
      search,
      status,
      sort,
      emitidasOnly: true,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[acbr:nfe] Falha ao listar NF-e:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar as NF-e.",
    });
  }
});

router.get("/support-data", async (req, res) => {
  try {
    const data = await NfeDAO.obterSupportData(req.db);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[acbr:nfe] Falha ao carregar dados de apoio:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar os dados auxiliares da NF-e.",
    });
  }
});

router.get("/pedidos-select", async (req, res) => {
  try {
    const data = await NfeDAO.listarPedidosSelect(req.db, {
      search: String(req.query.search || ""),
      limit: Number(req.query.limit || 20),
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[acbr:nfe] Falha ao pesquisar pedidos:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível pesquisar os pedidos de venda.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const data = await NfeDAO.buscarPorId(req.db, Number(req.params.id));

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "NF-e não encontrada.",
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[acbr:nfe] Falha ao buscar NF-e:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar a NF-e.",
    });
  }
});

router.get("/:id/danfe", async (req, res) => {
  try {
    const data = await AcbrLibProvider.gerarDanfePdf({
      client: req.db,
      nfeId: Number(req.params.id),
      tenantId: Number(req.user?.tenantId),
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${data.filename}"`);
    res.setHeader("Content-Length", data.buffer.length);
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.end(data.buffer);
  } catch (error) {
    if (isProviderStubError(error)) {
      if (error instanceof AcbrLibIntegrationError) {
        console.error("[acbr:nfe] Falha ao gerar DANFE pela ACBrLib:", {
          message: error.message,
          details: error.details,
        });
      }

      return res.status(error instanceof AcbrLibNotConfiguredError ? 501 : 400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("[acbr:nfe] Falha ao gerar DANFE:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível gerar o DANFE pela ACBrLib.",
    });
  }
});

router.get("/:id/previa", async (req, res) => {
  try {
    const data = await AcbrLibProvider.gerarPreviaDanfePdf({
      client: req.db,
      nfeId: Number(req.params.id),
      tenantId: Number(req.user?.tenantId),
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${data.filename}"`);
    res.setHeader("Content-Length", data.buffer.length);
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.end(data.buffer);
  } catch (error) {
    if (isProviderStubError(error)) {
      if (error instanceof AcbrLibIntegrationError) {
        console.error("[acbr:nfe] Falha ao gerar prévia pela ACBrLib:", {
          message: error.message,
          details: error.details,
        });
      }

      return res.status(error instanceof AcbrLibNotConfiguredError ? 501 : 400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("[acbr:nfe] Falha ao gerar prévia:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível gerar a prévia da NF-e pela ACBrLib.",
    });
  }
});

router.post("/emitir", async (req, res) => {
  try {
    const data = await NfeDAO.criarPorPedido(req.db, {
      pedidoVendaId: Number(req.body?.pedido_venda_id),
      usuarioId: Number(req.user?.userId) || null,
      payload: req.body || {},
    });

    return res.status(201).json({
      success: true,
      message: "NF-e criada como rascunho. Use a ação de processar emissão para enviar à SEFAZ.",
      data,
    });
  } catch (error) {
    console.error("[acbr:nfe] Falha ao registrar emissao:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível registrar a NF-e.",
    });
  }
});

router.post("/importar-xml", async (req, res) => {
  try {
    const data = await NfeDAO.registrarImportacaoXml(req.db, {
      payload: req.body || {},
      usuarioId: Number(req.user?.userId) || null,
    });

    return res.status(201).json({
      success: true,
      message: "XML importado com sucesso para o schema fiscal.",
      data,
    });
  } catch (error) {
    console.error("[acbr:nfe] Falha ao importar XML:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível importar o XML da NF-e.",
    });
  }
});

router.post("/distribuicao-chave", async (req, res) => {
  try {
    const chaveAcesso = normalizeAccessKey(req.body?.chave_acesso || req.body?.chave);

    if (!/^\d{44}$/.test(chaveAcesso)) {
      return res.status(400).json({
        success: false,
        message: "Chave de acesso da NF-e inválida.",
      });
    }

    const data = await AcbrLibProvider.distribuirNfePorChave({
      client: req.db,
      tenantId: Number(req.user?.tenantId),
      chaveAcesso,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    if (isProviderStubError(error)) {
      if (error instanceof AcbrLibIntegrationError) {
        console.error("[acbr:nfe] Falha na distribuição por chave:", {
          message: error.message,
          details: error.details,
        });
      }

      return res.status(error instanceof AcbrLibNotConfiguredError ? 501 : 400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("[acbr:nfe] Falha ao consultar distribuição por chave:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível consultar a NF-e por chave.",
    });
  }
});

router.post("/distribuicao-ult-nsu", async (req, res) => {
  try {
    const ultNsu = String(req.body?.ult_nsu || req.body?.ultNsu || "000000000000000")
      .replace(/\D/g, "")
      .padStart(15, "0")
      .slice(-15);

    const data = await AcbrLibProvider.distribuirNfePorUltNsu({
      client: req.db,
      tenantId: req.user?.tenantId,
      ultNsu,
    });

    return res.json({
      success: true,
      message: "Distribuição de NF-e por NSU consultada.",
      data,
    });
  } catch (error) {
    console.error("[acbr:nfe] Falha ao consultar distribuição por NSU:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível consultar a distribuição de NF-e.",
    });
  }
});

router.post("/manifestacao-destinatario", async (req, res) => {
  try {
    const chaveAcesso = normalizeAccessKey(req.body?.chave_acesso || req.body?.chave);

    if (!/^\d{44}$/.test(chaveAcesso)) {
      return res.status(400).json({
        success: false,
        message: "Chave de acesso da NF-e inválida.",
      });
    }

    const data = await AcbrLibProvider.manifestarNfeDestinatario({
      client: req.db,
      tenantId: req.user?.tenantId,
      chaveAcesso,
      tipoEvento: req.body?.tipo_evento,
      justificativa: req.body?.justificativa,
    });

    return res.json({
      success: true,
      message: "Manifestação da NF-e enviada para a SEFAZ.",
      data,
    });
  } catch (error) {
    console.error("[acbr:nfe] Falha ao enviar manifestação:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível enviar a manifestação da NF-e.",
    });
  }
});

router.post("/:id/processar", async (req, res) => {
  try {
    const data = await AcbrLibProvider.emitirNfe({
      client: req.db,
      nfeId: Number(req.params.id),
      tenantId: Number(req.user?.tenantId),
      userId: Number(req.user?.userId) || null,
    });

    return res.json({
      success: !!data.success,
      message: buildProcessarNfeMessage(data),
      data,
    });
  } catch (error) {
    if (isProviderStubError(error)) {
      if (error instanceof AcbrLibIntegrationError) {
        console.error("[acbr:nfe] Falha de integração ACBrLib:", {
          message: error.message,
          details: error.details,
        });
      }

      return res.status(error instanceof AcbrLibNotConfiguredError ? 501 : 400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("[acbr:nfe] Falha ao processar emissao:", error);

    if (isFiscalValidationError(error)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Não foi possível processar a emissão da NF-e.",
    });
  }
});

router.post("/:id/consultar-status", async (req, res) => {
  try {
    const nfe = await NfeDAO.buscarPorId(req.db, Number(req.params.id));

    if (!nfe) {
      return res.status(404).json({
        success: false,
        message: "NF-e não encontrada.",
      });
    }

    if (!nfe.chave_acesso) {
      return res.status(400).json({
        success: false,
        message: "A NF-e ainda não possui chave de acesso para consulta. Primeiro processe/envie a NF-e.",
        data: nfe,
      });
    }

    const data = await NfeDAO.registrarEvento(req.db, {
      nfeId: Number(req.params.id),
      usuarioId: Number(req.user?.userId) || null,
      tipoEvento: "consulta_status_manual",
      mensagem: "Solicitada consulta manual de status da NF-e.",
      payload: req.body || {},
    });

    try {
      const response = await AcbrLibProvider.consultarStatus({
        client: req.db,
        nfeId: Number(req.params.id),
        tenantId: Number(req.user?.tenantId),
        userId: Number(req.user?.userId) || null,
      });

      return res.json({
        success: isConsultaFiscalConclusiva(response),
        message: buildConsultarNfeMessage(response),
        data,
        response,
      });
    } catch (error) {
      if (isProviderStubError(error)) {
        return res.status(error instanceof AcbrLibNotConfiguredError ? 501 : 400).json({
          success: false,
          message: error.message,
          data,
        });
      }

      throw error;
    }
  } catch (error) {
    console.error("[acbr:nfe] Falha ao consultar status:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível consultar o status da NF-e.",
    });
  }
});

router.post("/:id/cancelar", async (req, res) => {
  try {
    const data = await NfeDAO.registrarEvento(req.db, {
      nfeId: Number(req.params.id),
      usuarioId: Number(req.user?.userId) || null,
      tipoEvento: "cancelamento_solicitado",
      mensagem: "Solicitado cancelamento manual da NF-e.",
      payload: req.body || {},
    });

    try {
      const response = await AcbrLibProvider.cancelarNfe({
        client: req.db,
        nfeId: Number(req.params.id),
        tenantId: Number(req.user?.tenantId),
        justificativa: req.body?.justificativa || null,
        userId: Number(req.user?.userId) || null,
      });

      const cancelada = String(response?.mappedStatus || "").toLowerCase() === "cancelada";

      return res.json({
        success: cancelada,
        message: buildCancelarNfeMessage(response),
        data,
        response,
      });
    } catch (error) {
      if (isProviderStubError(error)) {
        return res.status(error instanceof AcbrLibNotConfiguredError ? 501 : 400).json({
          success: false,
          message: error.message,
          data,
        });
      }

      throw error;
    }
  } catch (error) {
    console.error("[acbr:nfe] Falha ao cancelar NF-e:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cancelar a NF-e.",
    });
  }
});

export default router;
