import { Router } from "express";
import { criarVenda, listVendas } from "../modules/vendas/vendaRepository.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({ success: true, data: listVendas({ limit: Number(req.query.limit || 50) }) });
});

router.post("/", async (req, res, next) => {
  try {
    const data = await criarVenda(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
