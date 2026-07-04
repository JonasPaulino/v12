import express from "express";
import { pool } from "../config/conexao.js";
import desktopSyncAuth from "../middleware/desktopSyncAuth.js";
import DesktopSyncDAO from "../model/desktopSyncDAO.js";

const router = express.Router();

router.use("/desktop/sync", desktopSyncAuth);

router.get("/desktop/sync/produtos", async (req, res) => {
  try {
    const tenantId = Number(req.query.tenant_id);
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      return res.status(400).json({
        success: false,
        message: "tenant_id obrigatório.",
      });
    }

    const tenantAtivo = await DesktopSyncDAO.validarTenantAtivo(pool, tenantId);
    if (!tenantAtivo) {
      return res.status(403).json({
        success: false,
        message: "Filial inativa, bloqueada ou não encontrada.",
      });
    }

    const data = await DesktopSyncDAO.listarProdutos(pool, {
      tenantId,
      since: req.query.since || null,
      limit: Number(req.query.limit || 1000),
    });

    return res.json({
      success: true,
      data,
      count: data.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[desktop-sync] Falha ao sincronizar produtos:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível sincronizar produtos.",
    });
  }
});

export default router;
