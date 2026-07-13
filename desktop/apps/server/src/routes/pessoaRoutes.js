import { Router } from "express";
import { assertTerminalConfigurado } from "../modules/configuracao/localConfigRepository.js";
import { createPessoa, listPessoas } from "../modules/pessoas/pessoaRepository.js";

const router = Router();

router.use((_req, _res, next) => {
  try {
    assertTerminalConfigurado();
    next();
  } catch (error) {
    next(error);
  }
});

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
