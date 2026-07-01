import express from "express";
import NfeManifestacaoDAO from "../model/nfeManifestacaoDAO.js";

const router = express.Router();

const parseSort = (value) => {
  try {
    return value ? JSON.parse(String(value)) : {};
  } catch {
    return {};
  }
};

router.get("/", async (req, res) => {
  try {
    const result = await NfeManifestacaoDAO.listar(req.db, {
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 12),
      search: String(req.query.search || ""),
      sort: parseSort(req.query.sort),
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[nfe-manifestacao] Falha ao listar:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar as NF-e recebidas para manifestação.",
    });
  }
});

router.post("/sincronizar", async (req, res) => {
  try {
    const data = await NfeManifestacaoDAO.sincronizarDistribuicao(req.db, {
      token: req.cookies?.token,
      usuarioId: Number(req.user?.userId) || null,
    });

    return res.json({
      success: true,
      message: "Consulta de NF-e recebidas concluída.",
      data,
    });
  } catch (error) {
    console.error("[nfe-manifestacao] Falha ao sincronizar:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível consultar as NF-e recebidas.",
    });
  }
});

router.post("/consultar-chave", async (req, res) => {
  try {
    const data = await NfeManifestacaoDAO.consultarPorChave(req.db, {
      chaveAcesso: req.body?.chave_acesso || req.body?.chave,
      token: req.cookies?.token,
      usuarioId: Number(req.user?.userId) || null,
    });

    return res.json({
      success: true,
      message: "Consulta por chave concluída.",
      data,
    });
  } catch (error) {
    console.error("[nfe-manifestacao] Falha ao consultar chave:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível consultar a chave informada.",
    });
  }
});

router.post("/:id/manifestar", async (req, res) => {
  try {
    const data = await NfeManifestacaoDAO.manifestar(req.db, Number(req.params.id), {
      tipoEvento: req.body?.tipo_evento,
      justificativa: req.body?.justificativa,
      usuarioId: Number(req.user?.userId) || null,
      token: req.cookies?.token,
    });

    return res.status(201).json({
      success: data.sucesso,
      message: data.sucesso
        ? "Manifestação enviada para a SEFAZ."
        : "A SEFAZ retornou erro na manifestação.",
      data,
    });
  } catch (error) {
    console.error("[nfe-manifestacao] Falha ao manifestar:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível enviar a manifestação.",
    });
  }
});

router.post("/:id/importar", async (req, res) => {
  try {
    const data = await NfeManifestacaoDAO.importarXml(req.db, Number(req.params.id), {
      usuarioId: Number(req.user?.userId) || null,
    });

    return res.status(201).json({
      success: true,
      message: "XML importado para entrada de mercadoria.",
      data,
    });
  } catch (error) {
    console.error("[nfe-manifestacao] Falha ao importar XML:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível importar o XML da NF-e.",
    });
  }
});

export default router;
