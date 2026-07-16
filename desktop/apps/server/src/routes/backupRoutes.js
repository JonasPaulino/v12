import { Router } from "express";
import { executarBackupFiscal, getBackupStatus } from "../services/backup/backupService.js";

const router = Router();

router.get("/status", (_req, res) => {
  res.json({ success: true, data: getBackupStatus() });
});

router.post("/executar", async (req, res, next) => {
  try {
    const data = await executarBackupFiscal({ motivo: req.body?.motivo || "manual" });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
