import { Router } from "express";
import { listPendingSync } from "../services/syncQueueService.js";
import { getCachedFinanceiroSupportData, syncFinanceiroSupportDataFromErp } from "../services/financeiroSupportDataSyncService.js";
import { processSyncQueue } from "../services/erpSyncService.js";
import { syncProdutosFromErp } from "../services/produtoSyncService.js";
import { syncUsuariosFromErp } from "../services/usuarioSyncService.js";

const router = Router();

router.get("/pendencias", (req, res) => {
  const data = listPendingSync(Number(req.query.limit || 50));
  res.json({ success: true, data });
});

router.post("/processar", async (_req, res) => {
  const data = await processSyncQueue();
  res.json(data);
});

router.post("/produtos", async (req, res, next) => {
  try {
    const data = await syncProdutosFromErp({ full: req.body?.full === true });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.post("/usuarios", async (_req, res, next) => {
  try {
    const data = await syncUsuariosFromErp();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/financeiro-support-data", async (req, res, next) => {
  try {
    const data = await getCachedFinanceiroSupportData({
      tipo: String(req.query.tipo || "receber"),
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.post("/financeiro-support-data", async (req, res, next) => {
  try {
    const data = await syncFinanceiroSupportDataFromErp({
      tipo: String(req.body?.tipo || "receber"),
      refresh: req.body?.refresh !== false,
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
