import express from "express";
import multer from "multer";
import EntradaMercadoriaDAO from "../model/entradaMercadoriaDAO.js";

const router = express.Router();
const uploadXml = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const originalName = String(file.originalname || "").toLowerCase();
    if (!originalName.endsWith(".xml")) {
      return cb(new Error("Envie um arquivo XML válido."));
    }
    return cb(null, true);
  },
}).single("xml");

const parseSort = (value) => {
  try {
    return value ? JSON.parse(String(value)) : {};
  } catch {
    return {};
  }
};

const parseProdutoVinculos = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return {};
  }
};

router.get("/", async (req, res) => {
  try {
    const result = await EntradaMercadoriaDAO.listar(req.db, {
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      search: String(req.query.search || ""),
      sort: parseSort(req.query.sort),
      onlyNfe: ["1", "true", "sim"].includes(String(req.query.onlyNfe || "").toLowerCase()),
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[entrada-mercadoria] Falha ao listar entradas:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar as entradas de mercadoria.",
    });
  }
});

router.get("/pedidos-compra-select", async (req, res) => {
  try {
    const data = await EntradaMercadoriaDAO.listarPedidosCompraSelect(req.db, {
      search: String(req.query.search || ""),
      limit: Number(req.query.limit || 20),
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[entrada-mercadoria] Falha ao pesquisar pedidos:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível pesquisar pedidos de compra.",
    });
  }
});

router.get("/xml-solicitacoes", async (req, res) => {
  try {
    const data = await EntradaMercadoriaDAO.listarSolicitacoesXml(req.db, {
      search: String(req.query.search || ""),
      limit: Number(req.query.limit || 20),
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[entrada-mercadoria] Falha ao listar solicitações XML:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar as solicitações de XML.",
    });
  }
});

router.post("/xml-solicitacoes", async (req, res) => {
  try {
    const data = await EntradaMercadoriaDAO.solicitarXmlPorChave(req.db, {
      chaveAcesso: req.body?.chave_acesso || req.body?.chave,
      usuarioId: Number(req.user?.userId) || null,
      token: req.cookies?.token,
    });

    return res.status(201).json({
      success: true,
      message: "Consulta da NF-e por chave registrada.",
      data,
    });
  } catch (error) {
    console.error("[entrada-mercadoria] Falha ao solicitar XML por chave:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível consultar a chave informada.",
    });
  }
});

router.post("/xml-solicitacoes/:id/consultar", async (req, res) => {
  try {
    const data = await EntradaMercadoriaDAO.consultarSolicitacaoXml(req.db, {
      solicitacaoId: Number(req.params.id),
      token: req.cookies?.token,
    });

    return res.json({
      success: true,
      message: "Consulta da NF-e atualizada.",
      data,
    });
  } catch (error) {
    console.error("[entrada-mercadoria] Falha ao atualizar solicitação XML:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível atualizar a consulta.",
    });
  }
});

router.get("/xml-solicitacoes/:id/preparar", async (req, res) => {
  try {
    const data = await EntradaMercadoriaDAO.prepararSolicitacaoXml(req.db, {
      solicitacaoId: Number(req.params.id),
    });

    return res.json({
      success: true,
      message: data.precisa_vinculo_produto
        ? "XML preparado. Existem produtos pendentes de vínculo."
        : "XML preparado para importação.",
      data,
    });
  } catch (error) {
    console.error("[entrada-mercadoria] Falha ao preparar solicitação XML:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível preparar o XML disponível.",
    });
  }
});

router.post("/xml-solicitacoes/:id/importar", async (req, res) => {
  try {
    const data = await EntradaMercadoriaDAO.importarSolicitacaoXml(req.db, {
      solicitacaoId: Number(req.params.id),
      usuarioId: Number(req.user?.userId) || null,
      produtoVinculos: parseProdutoVinculos(req.body?.produto_vinculos),
    });

    return res.status(201).json({
      success: true,
      message: "XML disponível importado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[entrada-mercadoria] Falha ao importar solicitação XML:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível importar o XML disponível.",
    });
  }
});

router.get("/pedido-compra/:id", async (req, res) => {
  try {
    const data = await EntradaMercadoriaDAO.buscarPedidoCompra(req.db, Number(req.params.id));
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Pedido de compra não encontrado.",
      });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[entrada-mercadoria] Falha ao buscar pedido:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível buscar o pedido de compra.",
    });
  }
});

router.post("/:id/manifestacoes", async (req, res) => {
  try {
    const data = await EntradaMercadoriaDAO.registrarManifestacao(
      req.db,
      Number(req.params.id),
      {
        tipo_evento: req.body?.tipo_evento,
        justificativa: req.body?.justificativa,
        usuarioId: Number(req.user?.userId) || null,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Manifestação registrada para a NF-e recebida.",
      data,
    });
  } catch (error) {
    console.error("[entrada-mercadoria] Falha ao registrar manifestação:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível registrar a manifestação.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const data = await EntradaMercadoriaDAO.buscarPorId(req.db, Number(req.params.id));
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Entrada de mercadoria não encontrada.",
      });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[entrada-mercadoria] Falha ao buscar entrada:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível buscar a entrada de mercadoria.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = await EntradaMercadoriaDAO.criar(req.db, {
      payload: req.body || {},
      usuarioId: Number(req.user?.userId) || null,
    });

    return res.status(201).json({
      success: true,
      message: "Entrada de mercadoria registrada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[entrada-mercadoria] Falha ao registrar entrada:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível registrar a entrada de mercadoria.",
    });
  }
});

router.post("/:id/cancelar", async (req, res) => {
  try {
    const data = await EntradaMercadoriaDAO.cancelar(req.db, Number(req.params.id), {
      usuarioId: Number(req.user?.userId) || null,
      motivo: req.body?.motivo,
    });

    return res.json({
      success: true,
      message: "Entrada de mercadoria cancelada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[entrada-mercadoria] Falha ao cancelar entrada:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cancelar a entrada de mercadoria.",
    });
  }
});

router.post("/xml", (req, res) => {
  uploadXml(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({
        success: false,
        message:
          uploadError instanceof multer.MulterError && uploadError.code === "LIMIT_FILE_SIZE"
            ? "O XML excede o tamanho permitido."
            : uploadError.message || "Não foi possível receber o XML.",
      });
    }

    try {
      if (!req.file?.buffer?.length) {
        return res.status(400).json({
          success: false,
          message: "Arquivo XML obrigatório.",
        });
      }

      const produtoVinculos = parseProdutoVinculos(req.body?.produto_vinculos);
      const data = await EntradaMercadoriaDAO.importarXml(req.db, {
        xmlContent: req.file.buffer.toString("utf8"),
        nomeArquivo: req.file.originalname,
        usuarioId: Number(req.user?.userId) || null,
        produtoVinculos,
      });

      return res.status(201).json({
        success: true,
        message: "XML importado e entrada registrada com sucesso.",
        data,
      });
    } catch (error) {
      console.error("[entrada-mercadoria] Falha ao importar XML:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Não foi possível importar o XML.",
      });
    }
  });
});

router.post("/xml/preparar", (req, res) => {
  uploadXml(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({
        success: false,
        message:
          uploadError instanceof multer.MulterError && uploadError.code === "LIMIT_FILE_SIZE"
            ? "O XML excede o tamanho permitido."
            : uploadError.message || "Não foi possível receber o XML.",
      });
    }

    try {
      if (!req.file?.buffer?.length) {
        return res.status(400).json({
          success: false,
          message: "Arquivo XML obrigatório.",
        });
      }

      const data = await EntradaMercadoriaDAO.prepararXmlImportacao(req.db, {
        xmlContent: req.file.buffer.toString("utf8"),
        nomeArquivo: req.file.originalname,
      });

      return res.json({
        success: true,
        message: data.precisa_vinculo_produto
          ? "XML preparado. Existem produtos pendentes de vínculo."
          : "XML preparado para importação.",
        data,
      });
    } catch (error) {
      console.error("[entrada-mercadoria] Falha ao preparar XML:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Não foi possível preparar o XML.",
      });
    }
  });
});

export default router;
