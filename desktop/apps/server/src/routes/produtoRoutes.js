import { Router } from "express";
import { listProdutos, upsertProduto } from "../modules/produtos/produtoRepository.js";

const router = Router();

router.get("/", (req, res) => {
  const data = listProdutos({
    search: req.query.search || "",
    limit: Number(req.query.limit || 50),
  });

  res.json({ success: true, data });
});

router.post("/", (req, res, next) => {
  try {
    const produtoId = upsertProduto(req.body);
    res.status(201).json({ success: true, data: { produto_id: produtoId } });
  } catch (error) {
    next(error);
  }
});

export default router;
