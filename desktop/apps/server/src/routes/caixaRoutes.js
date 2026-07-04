import { Router } from "express";
import { abrirCaixa, fecharCaixa, getCaixaAberto } from "../modules/caixa/caixaRepository.js";

const router = Router();

router.get("/atual", (_req, res) => {
  res.json({ success: true, data: getCaixaAberto() });
});

router.post("/abrir", (req, res, next) => {
  try {
    const data = abrirCaixa({
      operadorNome: req.body.operador_nome || "Operador",
      valorAbertura: req.body.valor_abertura || 0,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/fechar", (req, res, next) => {
  try {
    const data = fecharCaixa({ valorFechamento: req.body.valor_fechamento || 0 });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
