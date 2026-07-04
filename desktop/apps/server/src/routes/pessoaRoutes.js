import { Router } from "express";
import { createPessoa, listPessoas } from "../modules/pessoas/pessoaRepository.js";

const router = Router();

router.get("/", (req, res) => {
  const data = listPessoas({
    search: req.query.search || "",
    limit: Number(req.query.limit || 50),
  });

  res.json({ success: true, data });
});

router.post("/", (req, res, next) => {
  try {
    const pessoaId = createPessoa(req.body);
    res.status(201).json({ success: true, data: { pessoa_id: pessoaId } });
  } catch (error) {
    next(error);
  }
});

export default router;
