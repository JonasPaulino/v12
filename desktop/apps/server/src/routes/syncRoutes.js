import { Router } from "express";
import { listPendingSync } from "../services/syncQueueService.js";
import { processSyncQueue } from "../services/erpSyncService.js";

const router = Router();

router.get("/pendencias", (req, res) => {
  const data = listPendingSync(Number(req.query.limit || 50));
  res.json({ success: true, data });
});

router.post("/processar", async (_req, res) => {
  const data = await processSyncQueue();
  res.json(data);
});

export default router;
