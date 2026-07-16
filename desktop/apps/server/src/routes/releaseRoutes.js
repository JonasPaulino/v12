import { Router } from "express";
import {
  aplicarAtualizacaoPdv,
  baixarAtualizacaoPdv,
  getStatusAtualizacaoPdv,
  instalarAtualizacaoPdv,
  verificarAtualizacaoPdv,
} from "../services/atualizacao/releaseUpdateService.js";

const router = Router();

router.get("/status", (_req, res) => {
  res.json({ success: true, data: getStatusAtualizacaoPdv() });
});

router.post("/verificar", async (_req, res, next) => {
  try {
    const data = await verificarAtualizacaoPdv();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/aplicar", async (_req, res, next) => {
  try {
    const data = await aplicarAtualizacaoPdv();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/:releaseId/baixar", async (req, res, next) => {
  try {
    const data = await baixarAtualizacaoPdv(req.params.releaseId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/:releaseId/aplicar", async (req, res, next) => {
  try {
    const data = await aplicarAtualizacaoPdv(req.params.releaseId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/:releaseId/instalar", async (req, res, next) => {
  try {
    const data = await instalarAtualizacaoPdv(req.params.releaseId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
