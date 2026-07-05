import { Router } from "express";
import {
  abrirCaixa,
  fecharCaixa,
  getCaixaAberto,
  getResumoCaixa,
  registrarMovimentoCaixa,
} from "../modules/caixa/caixaRepository.js";

const router = Router();

router.get("/atual", (_req, res) => {
  res.json({ success: true, data: getCaixaAberto() });
});

router.get("/resumo", (_req, res) => {
  res.json({ success: true, data: getResumoCaixa() });
});

router.post("/abrir", (req, res, next) => {
  try {
    const data = abrirCaixa({
      operadorId: req.body.operador_id,
      valorAbertura: req.body.valor_abertura || 0,
      observacao: req.body.observacao,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/movimento", (req, res, next) => {
  try {
    const data = registrarMovimentoCaixa({
      operadorId: req.body.operador_id,
      tipo: req.body.tipo,
      valor: req.body.valor,
      motivo: req.body.motivo,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/fechar", (req, res, next) => {
  try {
    const data = fecharCaixa({
      valorFechamento: req.body.valor_fechamento || 0,
      observacao: req.body.observacao,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
