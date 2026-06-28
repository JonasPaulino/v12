import express from "express";
import DevolucaoMercadoriaDAO from "../model/devolucaoMercadoriaDAO.js";

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
    const result = await DevolucaoMercadoriaDAO.listar(req.db, {
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      search: String(req.query.search || ""),
      sort: parseSort(req.query.sort),
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[devolucao] Falha ao listar devoluções:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar as devoluções.",
    });
  }
});

router.get("/origens-select", async (req, res) => {
  try {
    const data = await DevolucaoMercadoriaDAO.listarOrigensSelect(req.db, {
      tipo: String(req.query.tipo || "venda"),
      search: String(req.query.search || ""),
      limit: Number(req.query.limit || 20),
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[devolucao] Falha ao pesquisar origens:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível pesquisar documentos de origem.",
    });
  }
});

router.get("/origem/:tipo/:id", async (req, res) => {
  try {
    const data = await DevolucaoMercadoriaDAO.buscarOrigem(
      req.db,
      String(req.params.tipo || "venda"),
      Number(req.params.id)
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Documento de origem não encontrado.",
      });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[devolucao] Falha ao buscar origem:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar o documento de origem.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const data = await DevolucaoMercadoriaDAO.buscarPorId(req.db, Number(req.params.id));
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Devolução não encontrada.",
      });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[devolucao] Falha ao buscar devolução:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível buscar a devolução.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = await DevolucaoMercadoriaDAO.criar(req.db, {
      payload: req.body || {},
      usuarioId: Number(req.user?.userId) || null,
    });

    return res.status(201).json({
      success: true,
      message: "Devolução registrada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[devolucao] Falha ao registrar devolução:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível registrar a devolução.",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const data = await DevolucaoMercadoriaDAO.atualizar(
      req.db,
      Number(req.params.id),
      req.body || {}
    );

    return res.json({
      success: true,
      message: "Devolução atualizada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[devolucao] Falha ao atualizar devolução:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível atualizar a devolução.",
    });
  }
});

router.post("/:id/cancelar", async (req, res) => {
  try {
    const data = await DevolucaoMercadoriaDAO.cancelar(req.db, Number(req.params.id), {
      usuarioId: Number(req.user?.userId) || null,
    });

    return res.json({
      success: true,
      message: "Devolução cancelada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[devolucao] Falha ao cancelar devolução:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cancelar a devolução.",
    });
  }
});

export default router;
